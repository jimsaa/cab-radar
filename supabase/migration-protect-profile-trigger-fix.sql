-- Hotfix: protect_profile_verification_fields crashes when licence columns are missing.
-- Run BEFORE migration-contribution-tracking-fix.sql if backfill failed.
-- Safe to re-run.

do $$ begin
  create type public.membership_type as enum (
    'active_driver',
    'annual_member',
    'inactive'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists cabradar_user_id text,
  add column if not exists driver_license_number text,
  add column if not exists driver_license_hash text,
  add column if not exists driver_license_last4 text,
  add column if not exists verified_at timestamptz,
  add column if not exists reputation_score integer not null default 0,
  add column if not exists report_usefulness_score numeric(8, 2) not null default 0,
  add column if not exists total_approved_reports integer not null default 0,
  add column if not exists reward_points_balance integer not null default 0,
  add column if not exists membership_type public.membership_type not null default 'inactive',
  add column if not exists membership_expires_at timestamptz,
  add column if not exists monthly_reports_count integer not null default 0,
  add column if not exists monthly_votes_count integer not null default 0,
  add column if not exists monthly_points integer not null default 0,
  add column if not exists last_monthly_reset date not null default date_trunc('month', now())::date,
  add column if not exists stripe_customer_id text,
  add column if not exists beta_user boolean not null default false,
  add column if not exists is_co_admin boolean not null default false;

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
  new.cabradar_user_id := old.cabradar_user_id;
  new.driver_license_number := old.driver_license_number;
  new.driver_license_hash := old.driver_license_hash;
  new.driver_license_last4 := old.driver_license_last4;
  new.verified_at := old.verified_at;
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
  new.is_co_admin := old.is_co_admin;

  return new;
end;
$$;

drop trigger if exists cabradar_protect_profile_fields on public.profiles;
create trigger cabradar_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();
