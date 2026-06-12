-- CabRadar — Alert validation v2 + emergency GPS
-- Run after migration-alert-validation.sql

-- -----------------------------------------------------------------------------
-- Prerequisites: verification column (safe to re-run)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.driver_verification_status as enum (
    'pending_verification',
    'verified',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists verification_status public.driver_verification_status
    not null default 'pending_verification';

update public.profiles
set verification_status = 'verified'
where is_admin = true
  and verification_status = 'pending_verification';

-- -----------------------------------------------------------------------------
-- Helper (safe to re-run if missing from earlier migrations)
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

-- Emergency GPS fields for Taxi i nöd
alter table public.driver_alerts
  add column if not exists emergency_last_latitude double precision,
  add column if not exists emergency_last_longitude double precision,
  add column if not exists emergency_last_gps_at timestamptz,
  add column if not exists emergency_last_speed_mps double precision,
  add column if not exists emergency_last_movement_at timestamptz;

-- Seed emergency GPS from alert location on new taxi_emergency alerts
create or replace function public.set_emergency_gps_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'taxi_emergency' and new.latitude is not null and new.longitude is not null then
    new.emergency_last_latitude := new.latitude;
    new.emergency_last_longitude := new.longitude;
    new.emergency_last_gps_at := now();
    new.emergency_last_movement_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists cabradar_emergency_gps_on_insert on public.driver_alerts;
create trigger cabradar_emergency_gps_on_insert
  before insert on public.driver_alerts
  for each row execute function public.set_emergency_gps_on_insert();

-- Only eligible types get removal votes; taxi_emergency never auto-closes
create or replace function public.apply_alert_validation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alert_row public.driver_alerts%rowtype;
  no_count integer;
begin
  if not public.is_verified_driver(new.user_id) then
    raise exception 'Endast verifierade förare kan validera varningar';
  end if;

  select * into alert_row from public.driver_alerts where id = new.alert_id for update;

  if alert_row.status <> 'active' then
    raise exception 'Varningen är inte längre aktiv';
  end if;

  if alert_row.type not in ('slow_traffic', 'total_stop', 'taxi_info', 'accident') then
    raise exception 'Denna varningstyp kan inte valideras';
  end if;

  perform public.record_alert_validation(new.user_id);

  if new.response = 'no' then
    update public.driver_alerts
    set
      rejection_count = rejection_count + 1,
      updated_at = now()
    where id = new.alert_id;

    select rejection_count into no_count
    from public.driver_alerts where id = new.alert_id;

    if no_count >= 2 then
      update public.driver_alerts
      set
        status = 'expired',
        validation_status = 'resolved',
        expires_at = now(),
        updated_at = now()
      where id = new.alert_id;
    end if;
  end if;

  return new;
end;
$$;

-- Taxi i nöd expires only via creator or admin — never by cron
create or replace function public.expire_stale_alerts()
returns void
language sql
security definer
set search_path = public
as $$
  update public.driver_alerts
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at < now() and type <> 'taxi_emergency';
$$;
