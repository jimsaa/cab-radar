-- Co-admin permission: Ring förare vid nödläge (emergency phone access).
-- Safe to re-run.

alter table public.profiles
  add column if not exists co_admin_emergency_call boolean not null default false;

comment on column public.profiles.co_admin_emergency_call is
  'Co-admin only: may view driver phone numbers during active Taxi i nöd alerts.';

-- Protect role fields from self-update (extends migration-protect-profile-trigger-fix)
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
