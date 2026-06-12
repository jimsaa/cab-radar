-- CabRadar — Community alert validation
-- Run after migration-alert-categories-data.sql
-- Requires: migration-membership.sql (monthly points functions)

-- -----------------------------------------------------------------------------
-- Prerequisites: verification column (safe if migration-driver-verification.sql
-- was not run yet)
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
-- Helper used by RLS policies and validation triggers
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

-- Validation responses from verified drivers passing alerts
create table if not exists public.alert_validations (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid not null references public.driver_alerts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  response   text not null check (response in ('yes', 'no', 'unknown')),
  created_at timestamptz not null default now(),
  unique (alert_id, user_id)
);

create index if not exists alert_validations_alert_id_idx on public.alert_validations (alert_id);
create index if not exists alert_validations_user_id_idx on public.alert_validations (user_id);

alter table public.driver_alerts
  add column if not exists confirmation_count integer not null default 0,
  add column if not exists rejection_count integer not null default 0,
  add column if not exists validation_status text not null default 'active'
    check (validation_status in ('active', 'confirmed', 'resolved'));

-- Award +2 contribution points for validating
create or replace function public.record_alert_validation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  if not public.is_verified_driver(p_user_id) then return; end if;

  perform public.reset_monthly_contribution_if_needed(p_user_id);

  update public.profiles
  set
    monthly_points = monthly_points + 2,
    reputation_score = reputation_score + 2,
    updated_at = now()
  where id = p_user_id;

  perform public.recalculate_membership(p_user_id);
end;
$$;

-- Process validation and update alert counts / expiry
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

  perform public.record_alert_validation(new.user_id);

  if new.response = 'yes' then
    update public.driver_alerts
    set
      confirmation_count = confirmation_count + 1,
      validation_status = case
        when confirmation_count + 1 >= 3 then 'confirmed'
        else validation_status
      end,
      updated_at = now()
    where id = new.alert_id;
  elsif new.response = 'no' then
    update public.driver_alerts
    set
      rejection_count = rejection_count + 1,
      updated_at = now()
    where id = new.alert_id;

    select rejection_count into no_count
    from public.driver_alerts where id = new.alert_id;

    if no_count >= 3 then
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

drop trigger if exists cabradar_alert_validation_apply on public.alert_validations;
create trigger cabradar_alert_validation_apply
  after insert on public.alert_validations
  for each row execute function public.apply_alert_validation();

alter table public.alert_validations enable row level security;

drop policy if exists "Verified drivers insert validations" on public.alert_validations;
create policy "Verified drivers insert validations"
  on public.alert_validations for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_verified_driver(auth.uid())
  );

drop policy if exists "Users view own validations" on public.alert_validations;
create policy "Users view own validations"
  on public.alert_validations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins view all validations" on public.alert_validations;
create policy "Admins view all validations"
  on public.alert_validations for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Updated expiry defaults per alert type
create or replace function public.set_alert_defaults()
returns trigger
language plpgsql
as $$
begin
  if public.alert_requires_admin_approval(new.type) then
    new.status := 'pending_review';
    new.admin_verified := false;
  else
    new.status := 'active';
    new.admin_verified := true;
  end if;

  new.expires_at := case new.type
    when 'slow_traffic' then now() + interval '30 minutes'
    when 'total_stop' then now() + interval '60 minutes'
    when 'accident' then now() + interval '2 hours'
    when 'taxi_emergency' then now() + interval '365 days'
    when 'taxi_info' then now() + interval '365 days'
    when 'traffic_control' then now() + interval '2 hours'
    when 'total_stop_accident' then now() + interval '60 minutes'
    when 'roadwork' then now() + interval '24 hours'
    when 'hazard_on_road' then now() + interval '2 hours'
    when 'ev_charger' then now() + interval '365 days'
    when 'restroom_break' then now() + interval '365 days'
    when 'unsafe_pickup_area' then now() + interval '7 days'
    when 'taxi_queue_hotspot' then now() + interval '6 hours'
    when 'general_driver_tip' then now() + interval '14 days'
    else now() + interval '2 hours'
  end;

  return new;
end;
$$;
