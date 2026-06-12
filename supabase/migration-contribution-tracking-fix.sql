-- Contribution tracking fix — count ALL submitted alerts (not only admin-verified active).
-- Safe to re-run. Backfills existing history without resetting unrelated fields.

-- ---------------------------------------------------------------------------
-- PREREQUISITE: profile update trigger blocks ANY profiles UPDATE (including
-- contribution backfill) when it references columns missing from this project.
-- ---------------------------------------------------------------------------

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
  -- SECURITY DEFINER / SQL editor / service role — allow system updates
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

-- ---------------------------------------------------------------------------
-- Recalculate one user's monthly stats from driver_alerts + alert_votes
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_user_monthly_contribution(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start timestamptz := date_trunc('month', now());
  report_count integer;
  vote_count integer;
  lifetime_reports integer;
begin
  if p_user_id is null then
    return;
  end if;

  perform public.reset_monthly_contribution_if_needed(p_user_id);

  select count(*)::integer into report_count
  from public.driver_alerts
  where created_by = p_user_id
    and created_at >= month_start;

  select count(*)::integer into vote_count
  from public.alert_votes
  where user_id = p_user_id
    and created_at >= month_start;

  select count(*)::integer into lifetime_reports
  from public.driver_alerts
  where created_by = p_user_id;

  update public.profiles
  set
    monthly_reports_count = report_count,
    monthly_votes_count = vote_count,
    monthly_points = (report_count * 10) + (vote_count * 5),
    total_approved_reports = lifetime_reports,
    updated_at = now()
  where id = p_user_id;

  perform public.recalculate_membership(p_user_id);
end;
$$;

comment on function public.recalculate_user_monthly_contribution(uuid) is
  'Recompute monthly contribution counters from alert/vote history (all alert types).';

-- ---------------------------------------------------------------------------
-- Backfill all drivers (run once — does not zero counters first)
-- ---------------------------------------------------------------------------

create or replace function public.backfill_all_contribution_stats()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  n integer := 0;
begin
  for uid in select id from public.profiles loop
    perform public.recalculate_user_monthly_contribution(uid);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.recalculate_user_monthly_contribution(uuid) to authenticated;

-- Backfill runs once below (SQL editor / migration only — not exposed to app users)

-- ---------------------------------------------------------------------------
-- Triggers: credit on submission (INSERT), not only on admin approval
-- ---------------------------------------------------------------------------

create or replace function public.on_alert_submitted_for_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.created_by is not null then
    perform public.recalculate_user_monthly_contribution(new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists cabradar_alert_contribution on public.driver_alerts;
create trigger cabradar_alert_contribution
  after insert on public.driver_alerts
  for each row execute function public.on_alert_submitted_for_contribution();

create or replace function public.on_alert_vote_for_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.user_id is not null then
    perform public.recalculate_user_monthly_contribution(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists cabradar_vote_contribution on public.alert_votes;
create trigger cabradar_vote_contribution
  after insert on public.alert_votes
  for each row execute function public.on_alert_vote_for_contribution();

-- ---------------------------------------------------------------------------
-- Profile sync always recalculates from source
-- ---------------------------------------------------------------------------

create or replace function public.sync_membership_for_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_user_monthly_contribution(p_user_id);
  return (select p from public.profiles p where p.id = p_user_id);
end;
$$;

-- Backfill existing data now
select public.backfill_all_contribution_stats();
