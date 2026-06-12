-- =============================================================================
-- CabRadar — Verification v2 (licence hash, CabRadar User ID, feedback)
-- =============================================================================
-- Run after migration-driver-verification.sql on existing projects.
-- Safe to re-run (idempotent where possible).
--
-- Set LICENCE_HASH_SECRET in your app (.env.local) to match the pepper below,
-- OR change both to the same random secret before running.
-- =============================================================================

create extension if not exists pgcrypto;

-- Pepper must match server LICENCE_HASH_SECRET (HMAC key; DB uses digest for backfill)
-- For new signups the app hashes with HMAC-SHA256; backfill uses digest+pepper.

do $$ begin
  perform set_config('cabradar.licence_pepper', 'cabradar-change-this-pepper', false);
exception when others then null;
end $$;

-- -----------------------------------------------------------------------------
-- New profile columns
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists cabradar_user_id text,
  add column if not exists driver_license_hash text,
  add column if not exists driver_license_last4 text;

-- Backfill CabRadar User IDs
create or replace function public.generate_cabradar_user_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Could not generate unique CabRadar User ID';
    end if;
    candidate := 'CR-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    exit when not exists (
      select 1 from public.profiles where cabradar_user_id = candidate
    );
  end loop;
  return candidate;
end;
$$;

update public.profiles
set cabradar_user_id = public.generate_cabradar_user_id()
where cabradar_user_id is null;

-- Backfill hash + last4 from legacy plaintext (6-digit licences only)
update public.profiles
set
  driver_license_last4 = right(driver_license_number, 4),
  driver_license_hash = encode(
    hmac(driver_license_number, 'cabradar-change-this-pepper', 'sha256'),
    'hex'
  ),
  driver_license_number = null
where driver_license_number is not null
  and driver_license_number ~ '^\d{6}$'
  and driver_license_hash is null;

-- Non-6-digit legacy values: clear plaintext, keep pending
update public.profiles
set driver_license_number = null
where driver_license_number is not null
  and driver_license_number !~ '^\d{6}$';

create unique index if not exists profiles_cabradar_user_id_key
  on public.profiles (cabradar_user_id)
  where cabradar_user_id is not null;

create unique index if not exists profiles_driver_license_hash_key
  on public.profiles (driver_license_hash)
  where driver_license_hash is not null;

drop index if exists public.profiles_driver_license_number_key;

comment on column public.profiles.cabradar_user_id is
  'Public support ID, format CR-XXXXXX — never changes';
comment on column public.profiles.driver_license_hash is
  'HMAC-SHA256 hash of 6-digit licence — never exposed to clients';
comment on column public.profiles.driver_license_last4 is
  'Last 4 digits for masked display (XX1234)';

-- -----------------------------------------------------------------------------
-- Signup trigger — CabRadar User ID, no plaintext licence
-- -----------------------------------------------------------------------------

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
    cabradar_user_id,
    verification_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    public.generate_cabradar_user_id(),
    'pending_verification'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Protect sensitive + immutable fields
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
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Feedback table
-- -----------------------------------------------------------------------------

create table if not exists public.user_feedback (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  cabradar_user_id text not null,
  display_name     text,
  subject          text not null,
  message          text not null,
  app_version      text not null default '0.0.0',
  status           text not null default 'ny'
    check (status in ('ny', 'behandlas', 'klar')),
  admin_notes      text,
  created_at       timestamptz not null default now()
);

create index if not exists user_feedback_status_idx on public.user_feedback (status);
create index if not exists user_feedback_created_at_idx on public.user_feedback (created_at desc);
create index if not exists user_feedback_cabradar_user_id_idx on public.user_feedback (cabradar_user_id);

alter table public.user_feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.user_feedback;
create policy "Users insert own feedback"
  on public.user_feedback for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users view own feedback" on public.user_feedback;
create policy "Users view own feedback"
  on public.user_feedback for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Admins update feedback" on public.user_feedback;
create policy "Admins update feedback"
  on public.user_feedback for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- -----------------------------------------------------------------------------
-- Column-level privacy: hide hash + plaintext licence from authenticated role
-- -----------------------------------------------------------------------------

revoke all on table public.profiles from authenticated;
grant select (
  id, display_name, phone_number, cabradar_user_id, driver_license_last4,
  verification_status, is_admin, fab_enabled, alert_chime_enabled,
  reputation_score, report_usefulness_score, total_approved_reports,
  reward_points_balance, created_at, updated_at
) on table public.profiles to authenticated;
alter table public.profiles
  alter column cabradar_user_id set not null;

grant update (
  display_name, phone_number, fab_enabled, alert_chime_enabled,
  verification_status, updated_at
) on table public.profiles to authenticated;
