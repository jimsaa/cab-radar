-- Contribution single source of truth — ensure triggers + backfill from driver_alerts.
-- Safe to re-run. Complements migration-contribution-tracking-fix.sql.

-- ---------------------------------------------------------------------------
-- Orphan alert audit (created_by IS NULL — cannot credit any driver)
-- ---------------------------------------------------------------------------

create or replace function public.audit_orphan_alerts()
returns table (
  id uuid,
  type public.alert_type,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.type, a.created_at
  from public.driver_alerts a
  where a.created_by is null
  order by a.created_at desc;
$$;

comment on function public.audit_orphan_alerts() is
  'Lists alerts with no created_by — contribution stats cannot attribute these.';

-- ---------------------------------------------------------------------------
-- Ensure INSERT trigger credits on submission (not only admin approval)
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

-- Backfill all profiles from alert history
select public.backfill_all_contribution_stats();

-- Orphan summary (visible in SQL editor result)
select count(*) as orphan_alerts from public.audit_orphan_alerts();
