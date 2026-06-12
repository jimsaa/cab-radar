-- =============================================================================
-- CabRadar — Driver verification (licence, phone, pending status)
-- =============================================================================
-- Safe to re-run. Run after schema.sql on fresh projects.
-- =============================================================================

do $$ begin
  create type public.driver_verification_status as enum (
    'pending_verification',
    'verified',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists driver_license_number text,
  add column if not exists verification_status public.driver_verification_status
    not null default 'pending_verification';

comment on column public.profiles.driver_license_number is
  'Private: used for admin verification only — never exposed in public APIs/UI';
comment on column public.profiles.verification_status is
  'pending_verification until admin approves taxi licence';

-- Existing users without licence → pending (admins can bulk-verify)
update public.profiles
set verification_status = 'verified'
where verification_status = 'pending_verification'
  and is_admin = true;

create unique index if not exists profiles_driver_license_number_key
  on public.profiles (driver_license_number)
  where driver_license_number is not null;

-- -----------------------------------------------------------------------------

create or replace function public.is_verified_driver(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id
      and (verification_status = 'verified' or is_admin = true)
  );
$$;

-- Signup: capture phone + licence from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    phone_number,
    driver_license_number,
    verification_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'driver_license_number'), ''),
    'pending_verification'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent drivers from self-verifying or changing licence number
create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  select is_admin into actor_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_admin, false) then
    return new;
  end if;

  new.verification_status := old.verification_status;
  new.driver_license_number := old.driver_license_number;
  new.is_admin := old.is_admin;
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;
  return new;
end;
$$;

drop trigger if exists cabradar_protect_profile_fields on public.profiles;
create trigger cabradar_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();

-- -----------------------------------------------------------------------------
-- RLS: profiles — own row or admin only (licence stays private)
-- -----------------------------------------------------------------------------

drop policy if exists "Profiles viewable by authenticated users" on public.profiles;
drop policy if exists "CabRadar profiles select" on public.profiles;
drop policy if exists "Users view own profile" on public.profiles;

create policy "Users view own profile or admin views all"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- -----------------------------------------------------------------------------
-- RLS: verified drivers only for alerts, deals, rewards
-- -----------------------------------------------------------------------------

drop policy if exists "Authenticated users create alerts" on public.driver_alerts;
create policy "Verified drivers create alerts"
  on public.driver_alerts for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.is_verified_driver(auth.uid())
  );

drop policy if exists "Users manage own votes" on public.alert_votes;
drop policy if exists "Users update own votes" on public.alert_votes;

create policy "Verified drivers manage own alert votes"
  on public.alert_votes for insert to authenticated
  with check (
    auth.uid() = user_id and public.is_verified_driver(auth.uid())
  );

create policy "Verified drivers update own alert votes"
  on public.alert_votes for update to authenticated
  using (auth.uid() = user_id and public.is_verified_driver(auth.uid()));

drop policy if exists "Anyone views active deals" on public.taxi_deals;
drop policy if exists "CabRadar view active deals" on public.taxi_deals;

create policy "Verified drivers view active deals"
  on public.taxi_deals for select to authenticated
  using (
    is_active = true
    and valid_until >= current_date
    and public.is_verified_driver(auth.uid())
  );

drop policy if exists "CabRadar insert help votes" on public.help_article_votes;
drop policy if exists "CabRadar update help votes" on public.help_article_votes;

create policy "Verified drivers insert help votes"
  on public.help_article_votes for insert to authenticated
  with check (
    auth.uid() = user_id and public.is_verified_driver(auth.uid())
  );

create policy "Verified drivers update help votes"
  on public.help_article_votes for update to authenticated
  using (auth.uid() = user_id and public.is_verified_driver(auth.uid()));

drop policy if exists "Users view own point history" on public.point_transactions;
create policy "Verified drivers view own point history"
  on public.point_transactions for select to authenticated
  using (
    auth.uid() = user_id and public.is_verified_driver(auth.uid())
  );
