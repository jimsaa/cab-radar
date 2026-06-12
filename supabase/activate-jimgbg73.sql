-- Activate jimgbg73@gmail.com (Jim On Road) + membership columns if missing
-- Run in Supabase SQL Editor

do $$ begin
  create type public.membership_type as enum (
    'active_driver',
    'annual_member',
    'inactive'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists membership_type public.membership_type not null default 'inactive',
  add column if not exists membership_expires_at timestamptz,
  add column if not exists monthly_reports_count integer not null default 0,
  add column if not exists monthly_votes_count integer not null default 0,
  add column if not exists monthly_points integer not null default 0,
  add column if not exists last_monthly_reset date not null default date_trunc('month', now())::date;

update public.profiles
set
  verification_status = 'verified',
  membership_type = 'active_driver',
  membership_expires_at = null,
  updated_at = now()
where id = 'ca340a4a-26d0-46b6-9286-21f5a535d370';
