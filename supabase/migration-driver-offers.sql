-- Exclusive Driver Offers (Erbjudanden) — banner A/B, admin notes, co-admin permission.
-- Safe to re-run.

alter table public.taxi_deals
  add column if not exists start_date date,
  add column if not exists banner_a_url text,
  add column if not exists banner_b_url text,
  add column if not exists redemption_text text not null default '',
  add column if not exists admin_notes text not null default '';

alter table public.taxi_deals
  alter column valid_until drop not null;

alter table public.profiles
  add column if not exists co_admin_manage_offers boolean not null default false;

comment on column public.taxi_deals.banner_a_url is 'Driver-facing teaser banner (Banner 1A)';
comment on column public.taxi_deals.banner_b_url is 'Driver-facing reveal banner (Banner 1B)';
comment on column public.taxi_deals.redemption_text is 'Code, phrase, or instructions shown to drivers on reveal';
comment on column public.taxi_deals.admin_notes is 'Private admin/co-admin notes — never exposed to drivers';
comment on column public.profiles.co_admin_manage_offers is 'Co-admin: create/edit driver offers';

-- Protect co_admin_manage_offers from self-update
create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select is_admin into actor_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_admin, false) then
    return new;
  end if;

  new.verification_status := old.verification_status;
  new.is_admin := old.is_admin;
  new.is_co_admin := old.is_co_admin;
  new.co_admin_emergency_call := old.co_admin_emergency_call;
  new.co_admin_manage_offers := old.co_admin_manage_offers;
  new.cabradar_user_id := old.cabradar_user_id;
  new.membership_type := old.membership_type;
  new.membership_expires_at := old.membership_expires_at;
  new.monthly_reports_count := old.monthly_reports_count;
  new.monthly_votes_count := old.monthly_votes_count;
  new.monthly_points := old.monthly_points;
  new.last_monthly_reset := old.last_monthly_reset;
  new.stripe_customer_id := old.stripe_customer_id;
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;
  new.beta_user := old.beta_user;

  if to_jsonb(old) ? 'driver_license_number' then
    new.driver_license_number := old.driver_license_number;
  end if;
  if to_jsonb(old) ? 'driver_license_hash' then
    new.driver_license_hash := old.driver_license_hash;
  end if;
  if to_jsonb(old) ? 'driver_license_last4' then
    new.driver_license_last4 := old.driver_license_last4;
  end if;
  if to_jsonb(old) ? 'verified_at' then
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists cabradar_protect_profile_fields on public.profiles;
create trigger cabradar_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();

-- Offer managers: full admin or co-admin with manage offers permission
create or replace function public.can_manage_driver_offers(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = user_id
      and (p.is_admin or (p.is_co_admin and p.co_admin_manage_offers))
  );
$$;

drop policy if exists "Admins manage deals" on public.taxi_deals;
drop policy if exists "CabRadar admins manage deals" on public.taxi_deals;

create policy "Offer managers manage deals"
  on public.taxi_deals for all to authenticated
  using (public.can_manage_driver_offers(auth.uid()))
  with check (public.can_manage_driver_offers(auth.uid()));

-- Storage bucket for offer banners
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offers',
  'offers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read offer banners" on storage.objects;
create policy "Public read offer banners"
  on storage.objects for select
  using (bucket_id = 'offers');

drop policy if exists "Offer managers upload banners" on storage.objects;
create policy "Offer managers upload banners"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'offers'
    and public.can_manage_driver_offers(auth.uid())
  );

drop policy if exists "Offer managers update banners" on storage.objects;
create policy "Offer managers update banners"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'offers'
    and public.can_manage_driver_offers(auth.uid())
  );

drop policy if exists "Offer managers delete banners" on storage.objects;
create policy "Offer managers delete banners"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'offers'
    and public.can_manage_driver_offers(auth.uid())
  );
