-- =============================================================================
-- CabRadar — Membership system (active driver / annual / inactive)
-- =============================================================================
-- Run after migration-verification-v2.sql
-- Safe to re-run where noted.
-- =============================================================================

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
  add column if not exists last_monthly_reset date not null default date_trunc('month', now())::date,
  add column if not exists stripe_customer_id text;

comment on column public.profiles.membership_type is
  'active_driver = free via contribution; annual_member = paid; inactive = no access';
comment on column public.profiles.monthly_reports_count is
  'Approved alerts this calendar month (threshold: 5)';
comment on column public.profiles.monthly_votes_count is
  'Votes on other drivers alerts this month (threshold: 10)';
comment on column public.profiles.monthly_points is
  'Contribution points this month (threshold: 50)';

-- Verified drivers start inactive until they contribute or pay
update public.profiles
set membership_type = 'inactive'
where verification_status = 'verified'
  and is_admin = false
  and membership_type is distinct from 'annual_member';

-- Admins always active
update public.profiles
set membership_type = 'active_driver'
where is_admin = true;

-- -----------------------------------------------------------------------------
-- Contribution thresholds (mirrored in src/lib/membership.ts)
-- -----------------------------------------------------------------------------

create or replace function public.meets_contribution_requirements(
  p_reports integer,
  p_votes integer,
  p_points integer
)
returns boolean
language sql
immutable
as $$
  select p_reports >= 5 or p_votes >= 10 or p_points >= 50;
$$;

-- -----------------------------------------------------------------------------
-- Reset + recalculate membership for one user
-- -----------------------------------------------------------------------------

create or replace function public.reset_monthly_contribution_if_needed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  month_start date := date_trunc('month', now())::date;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then return; end if;

  if p.last_monthly_reset >= month_start then
    return;
  end if;

  update public.profiles
  set
    monthly_reports_count = 0,
    monthly_votes_count = 0,
    monthly_points = 0,
    last_monthly_reset = month_start,
    updated_at = now()
  where id = p_user_id;

  perform public.recalculate_membership(p_user_id);
end;
$$;

create or replace function public.recalculate_membership(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then return; end if;

  if p.is_admin then
    update public.profiles
    set membership_type = 'active_driver', updated_at = now()
    where id = p_user_id;
    return;
  end if;

  if p.verification_status <> 'verified' then
    update public.profiles
    set membership_type = 'inactive', updated_at = now()
    where id = p_user_id;
    return;
  end if;

  if p.membership_type = 'annual_member'
     and p.membership_expires_at is not null
     and p.membership_expires_at > now() then
    return;
  end if;

  if public.meets_contribution_requirements(
    p.monthly_reports_count,
    p.monthly_votes_count,
    p.monthly_points
  ) then
    update public.profiles
    set membership_type = 'active_driver', updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set
      membership_type = 'inactive',
      membership_expires_at = case
        when membership_type = 'annual_member' then membership_expires_at
        else null
      end,
      updated_at = now()
    where id = p_user_id;
  end if;
end;
$$;

-- Lazy sync called from app on profile load
create or replace function public.sync_membership_for_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.reset_monthly_contribution_if_needed(p_user_id);
  perform public.recalculate_membership(p_user_id);
  return (select p from public.profiles p where p.id = p_user_id);
end;
$$;

-- Bulk monthly reset (cron job)
create or replace function public.run_monthly_membership_reset()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now())::date;
  affected integer;
begin
  update public.profiles
  set
    monthly_reports_count = 0,
    monthly_votes_count = 0,
    monthly_points = 0,
    last_monthly_reset = month_start,
    updated_at = now()
  where last_monthly_reset < month_start
     or last_monthly_reset is null;

  get diagnostics affected = row_count;

  update public.profiles p
  set membership_type = 'inactive', updated_at = now()
  where not p.is_admin
    and p.verification_status = 'verified'
    and not (
      p.membership_type = 'annual_member'
      and p.membership_expires_at is not null
      and p.membership_expires_at > now()
    );

  return affected;
end;
$$;

-- -----------------------------------------------------------------------------
-- Access helpers for RLS
-- -----------------------------------------------------------------------------

create or replace function public.has_cabrador_access(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = user_id
      and (
        p.is_admin
        or (
          p.verification_status = 'verified'
          and (
            p.membership_type = 'active_driver'
            or (
              p.membership_type = 'annual_member'
              and p.membership_expires_at is not null
              and p.membership_expires_at > now()
            )
          )
        )
      )
  );
$$;

create or replace function public.can_contribute_to_community(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_verified_driver(user_id)
     and public.has_cabrador_access(user_id);
$$;

-- -----------------------------------------------------------------------------
-- Track contributions
-- -----------------------------------------------------------------------------

create or replace function public.record_approved_report(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  perform public.reset_monthly_contribution_if_needed(p_user_id);

  update public.profiles
  set
    monthly_reports_count = monthly_reports_count + 1,
    monthly_points = monthly_points + 10,
    total_approved_reports = total_approved_reports + 1,
    reputation_score = reputation_score + 10,
    updated_at = now()
  where id = p_user_id;

  perform public.recalculate_membership(p_user_id);
end;
$$;

create or replace function public.record_alert_vote(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  perform public.reset_monthly_contribution_if_needed(p_user_id);

  update public.profiles
  set
    monthly_votes_count = monthly_votes_count + 1,
    monthly_points = monthly_points + 5,
    updated_at = now()
  where id = p_user_id;

  perform public.recalculate_membership(p_user_id);
end;
$$;

-- Credit report when alert becomes active + verified
create or replace function public.on_alert_approved_for_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'
     and new.admin_verified = true
     and (tg_op = 'INSERT' or (old.status is distinct from 'active' or old.admin_verified is distinct from true))
  then
    perform public.record_approved_report(new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists cabradar_alert_contribution on public.driver_alerts;
create trigger cabradar_alert_contribution
  after insert or update on public.driver_alerts
  for each row execute function public.on_alert_approved_for_contribution();

-- Credit voter on new vote (not on update to avoid double-count)
create or replace function public.on_alert_vote_for_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_alert_vote(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists cabradar_vote_contribution on public.alert_votes;
create trigger cabradar_vote_contribution
  after insert on public.alert_votes
  for each row execute function public.on_alert_vote_for_contribution();

-- Protect membership fields from user self-update
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
  new.driver_license_hash := old.driver_license_hash;
  new.driver_license_last4 := old.driver_license_last4;
  new.cabradar_user_id := old.cabradar_user_id;
  new.is_admin := old.is_admin;
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
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS: gate community features on membership
-- -----------------------------------------------------------------------------

drop policy if exists "View active verified alerts" on public.driver_alerts;
create policy "Members view active verified alerts"
  on public.driver_alerts for select to authenticated
  using (
    public.has_cabrador_access(auth.uid())
    and (
      (status = 'active' and admin_verified = true)
      or created_by = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

drop policy if exists "Verified drivers create alerts" on public.driver_alerts;
create policy "Contributors create alerts"
  on public.driver_alerts for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.can_contribute_to_community(auth.uid())
  );

drop policy if exists "Verified drivers manage own alert votes" on public.alert_votes;
create policy "Contributors vote on alerts"
  on public.alert_votes for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.can_contribute_to_community(auth.uid())
  );

drop policy if exists "Verified drivers update own alert votes" on public.alert_votes;
create policy "Contributors update alert votes"
  on public.alert_votes for update to authenticated
  using (auth.uid() = user_id and public.can_contribute_to_community(auth.uid()));

drop policy if exists "Verified drivers view active deals" on public.taxi_deals;
create policy "Members view active deals"
  on public.taxi_deals for select to authenticated
  using (
    is_active = true
    and valid_until >= current_date
    and public.has_cabrador_access(auth.uid())
  );

drop policy if exists "CabRadar view published help" on public.help_articles;
drop policy if exists "Members view published help" on public.help_articles;
create policy "Members view published help"
  on public.help_articles for select to authenticated
  using (
    public.has_cabrador_access(auth.uid())
    and (
      (published = true and admin_verified = true)
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- Column grants: membership fields
grant select (
  membership_type, membership_expires_at,
  monthly_reports_count, monthly_votes_count, monthly_points,
  last_monthly_reset
) on table public.profiles to authenticated;

grant update (
  membership_type, membership_expires_at
) on table public.profiles to authenticated;

grant usage on schema public to authenticated;
grant execute on function public.sync_membership_for_user(uuid) to authenticated;
