-- =============================================================================
-- CabRadar — Complete Supabase Schema (FRESH projects only)
-- =============================================================================
-- Run in: Supabase Dashboard → SQL Editor
--
-- ⚠️  If you get "relation profiles already exists", STOP and run instead:
--     migration-existing-project.sql
--
-- Prerequisites:
--   1. Authentication → Providers → enable Email
--   2. Storage → New bucket → id: cab-radar-media → Public bucket: ON
--
-- After first signup, promote an admin:
--   update public.profiles set is_admin = true where id = '<your-auth-user-uuid>';
-- =============================================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.alert_type as enum (
  'total_stop',
  'slow_traffic',
  'accident',
  'taxi_emergency',
  'taxi_info',
  'traffic_control',
  'laser',
  'total_stop_accident',
  'roadwork',
  'hazard_on_road',
  'unsafe_pickup_area',
  'taxi_queue_hotspot',
  'ev_charger',
  'restroom_break',
  'general_driver_tip'
);

create type public.alert_status as enum (
  'pending_review',
  'active',
  'expired',
  'removed',
  'rejected'
);

create type public.banner_slot as enum (
  'dashboard_top',
  'deals_page',
  'alert_feed'
);

create type public.driver_verification_status as enum (
  'pending_verification',
  'verified',
  'rejected'
);

-- -----------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text,
  nickname                text,
  phone_number            text,
  driver_license_number   text,
  verification_status     public.driver_verification_status not null default 'pending_verification',
  verified_at             timestamptz,
  is_admin                boolean not null default false,
  is_co_admin             boolean not null default false,
  fab_enabled             boolean not null default true,
  alert_chime_enabled     boolean not null default true,
  push_enabled            boolean not null default true,
  push_prompted           boolean not null default false,
  -- Future point system (not active in v1)
  reputation_score        integer not null default 0,
  report_usefulness_score numeric(8, 2) not null default 0,
  total_approved_reports  integer not null default 0,
  reward_points_balance   integer not null default 0,
  taxi_company_name       text,
  taxi_operator           text,
  taxi_number             text,
  taximeter_type          text,
  last_known_latitude     double precision,
  last_known_longitude    double precision,
  last_known_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on column public.profiles.is_co_admin is 'Trusted co-admin: Taxi i nöd emergency access only';
comment on column public.profiles.driver_license_number is 'Private: admin verification only — never shown publicly';
comment on column public.profiles.verification_status is 'pending_verification until admin approves taxi licence';
comment on column public.profiles.reward_points_balance is 'Future: points earned for useful reports — not redeemable in v1';
comment on column public.profiles.report_usefulness_score is 'Aggregated usefulness from community votes on approved alerts';

-- -----------------------------------------------------------------------------
-- Driver alerts
-- -----------------------------------------------------------------------------

create table public.driver_alerts (
  id              uuid primary key default gen_random_uuid(),
  type            public.alert_type not null,
  title           text not null,
  description     text not null default '',
  latitude        double precision,
  longitude       double precision,
  road_address    text,
  city            text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '4 hours'),
  status          public.alert_status not null default 'active',
  admin_verified  boolean not null default true,
  is_major        boolean not null default false,
  upvotes         integer not null default 0,
  downvotes       integer not null default 0,
  confirmation_count integer not null default 0,
  rejection_count integer not null default 0,
  validation_status text not null default 'active'
    check (validation_status in ('active', 'confirmed', 'resolved')),
  emergency_last_latitude double precision,
  emergency_last_longitude double precision,
  emergency_last_gps_at timestamptz,
  emergency_last_speed_mps double precision,
  emergency_last_movement_at timestamptz,
  updated_at      timestamptz not null default now(),

  constraint driver_alerts_title_length check (char_length(title) between 2 and 120),
  constraint driver_alerts_lat_range check (latitude is null or latitude between -90 and 90),
  constraint driver_alerts_lng_range check (longitude is null or longitude between -180 and 180)
);

create index driver_alerts_status_idx on public.driver_alerts (status);
create index driver_alerts_type_idx on public.driver_alerts (type);
create index driver_alerts_created_at_idx on public.driver_alerts (created_at desc);
create index driver_alerts_expires_at_idx on public.driver_alerts (expires_at);
create index driver_alerts_location_idx on public.driver_alerts (latitude, longitude)
  where latitude is not null and longitude is not null;

comment on table public.driver_alerts is 'Real-time driver alerts for traffic, safety, and convenience';

-- -----------------------------------------------------------------------------
-- Alert votes (one vote per user per alert)
-- -----------------------------------------------------------------------------

create table public.alert_votes (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid not null references public.driver_alerts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       smallint not null,
  created_at timestamptz not null default now(),

  constraint alert_votes_value check (vote in (-1, 1)),
  unique (alert_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Alert validations (community confirmation when passing alerts)
-- -----------------------------------------------------------------------------

create table public.alert_validations (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid not null references public.driver_alerts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  response   text not null check (response in ('yes', 'no', 'unknown')),
  created_at timestamptz not null default now(),
  unique (alert_id, user_id)
);

create index alert_validations_alert_id_idx on public.alert_validations (alert_id);
create index alert_validations_user_id_idx on public.alert_validations (user_id);

-- -----------------------------------------------------------------------------
-- Taxi deals
-- -----------------------------------------------------------------------------

create table public.taxi_deals (
  id                  uuid primary key default gen_random_uuid(),
  business_name       text not null,
  offer_title         text not null,
  offer_description   text not null default '',
  address             text not null default '',
  valid_until         date not null,
  image_url           text,
  is_active           boolean not null default true,
  monthly_partner_fee numeric(10, 2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index taxi_deals_active_idx on public.taxi_deals (is_active, valid_until desc);

-- -----------------------------------------------------------------------------
-- Banner ads
-- -----------------------------------------------------------------------------

create table public.banner_ads (
  id          uuid primary key default gen_random_uuid(),
  slot        public.banner_slot not null,
  title       text not null default '',
  image_url   text not null,
  link_url    text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (slot, sort_order)
);

-- -----------------------------------------------------------------------------
-- Web push subscriptions
-- -----------------------------------------------------------------------------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),

  unique (user_id, endpoint)
);

-- -----------------------------------------------------------------------------
-- Future point ledger (prepared, not used in v1 UI)
-- -----------------------------------------------------------------------------

create table public.point_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  alert_id    uuid references public.driver_alerts (id) on delete set null,
  points      integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

comment on table public.point_transactions is 'Future rewards ledger — inactive in v1';

-- -----------------------------------------------------------------------------
-- Helper: alert types requiring admin approval
-- -----------------------------------------------------------------------------

create or replace function public.alert_requires_admin_approval(t public.alert_type)
returns boolean
language sql
immutable
as $$
  select t in ('taxi_info', 'unsafe_pickup_area', 'general_driver_tip');
$$;

-- -----------------------------------------------------------------------------
-- Auto-create profile on signup
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Driver verification helper
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
  new.verified_at := old.verified_at;
  new.is_admin := old.is_admin;
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;
  return new;
end;
$$;

create trigger cabradar_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();

create unique index profiles_driver_license_number_key
  on public.profiles (driver_license_number)
  where driver_license_number is not null;

-- -----------------------------------------------------------------------------
-- Set alert defaults on insert (admin review, expiry by type)
-- -----------------------------------------------------------------------------

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
    when 'total_stop_accident' then now() + interval '60 minutes'
    when 'accident' then now() + interval '2 hours'
    when 'taxi_emergency' then timestamptz '2099-12-31 23:59:59+00'
    when 'taxi_info' then now() + interval '365 days'
    when 'traffic_control' then now() + interval '2 hours'
    when 'laser' then now() + interval '2 hours'
    when 'roadwork' then now() + interval '24 hours'
    when 'hazard_on_road' then now() + interval '2 hours'
    when 'unsafe_pickup_area' then now() + interval '7 days'
    when 'taxi_queue_hotspot' then now() + interval '6 hours'
    when 'ev_charger' then now() + interval '365 days'
    when 'restroom_break' then now() + interval '365 days'
    when 'general_driver_tip' then now() + interval '14 days'
    else now() + interval '2 hours'
  end;

  new.updated_at := now();
  return new;
end;
$$;

create trigger driver_alerts_before_insert
  before insert on public.driver_alerts
  for each row execute function public.set_alert_defaults();

-- -----------------------------------------------------------------------------
-- Sync vote counts
-- -----------------------------------------------------------------------------

create or replace function public.sync_alert_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.alert_id, old.alert_id);
  update public.driver_alerts
  set
    upvotes = (select count(*) from public.alert_votes where alert_id = target and vote = 1),
    downvotes = (select count(*) from public.alert_votes where alert_id = target and vote = -1),
    updated_at = now()
  where id = target;
  return coalesce(new, old);
end;
$$;

create trigger alert_votes_after_change
  after insert or update or delete on public.alert_votes
  for each row execute function public.sync_alert_vote_counts();

-- -----------------------------------------------------------------------------
-- Alert validation (points + auto-close)
-- -----------------------------------------------------------------------------

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

create trigger cabradar_alert_validation_apply
  after insert on public.alert_validations
  for each row execute function public.apply_alert_validation();

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

create trigger cabradar_emergency_gps_on_insert
  before insert on public.driver_alerts
  for each row execute function public.set_emergency_gps_on_insert();

-- -----------------------------------------------------------------------------
-- Expire old alerts (call via cron or on read)
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.driver_alerts enable row level security;
alter table public.alert_votes enable row level security;
alter table public.alert_validations enable row level security;
alter table public.taxi_deals enable row level security;
alter table public.banner_ads enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.point_transactions enable row level security;

-- Profiles
create policy "Users view own profile or admin views all"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin or p.is_co_admin)
    )
  );

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Driver alerts: public read active + approved; authors see own pending
create policy "View active verified alerts"
  on public.driver_alerts for select
  using (
    (status = 'active' and admin_verified = true)
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "Verified drivers create alerts"
  on public.driver_alerts for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.is_verified_driver(auth.uid())
  );

create policy "Authors update own alerts"
  on public.driver_alerts for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
    )
    or (
      type = 'taxi_emergency'
      and status = 'active'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_co_admin
      )
    )
  );

create policy "Admins delete alerts"
  on public.driver_alerts for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Alert votes
create policy "View votes when authenticated"
  on public.alert_votes for select to authenticated using (true);

create policy "Verified drivers manage own alert votes"
  on public.alert_votes for insert to authenticated
  with check (
    auth.uid() = user_id and public.is_verified_driver(auth.uid())
  );

create policy "Verified drivers update own alert votes"
  on public.alert_votes for update to authenticated
  using (auth.uid() = user_id and public.is_verified_driver(auth.uid()));

create policy "Users delete own votes"
  on public.alert_votes for delete to authenticated
  using (auth.uid() = user_id);

-- Alert validations
create policy "Verified drivers insert validations"
  on public.alert_validations for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_verified_driver(auth.uid())
  );

create policy "Users view own validations"
  on public.alert_validations for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins view all validations"
  on public.alert_validations for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Taxi deals: public read active
create policy "Verified drivers view active deals"
  on public.taxi_deals for select to authenticated
  using (
    is_active = true
    and valid_until >= current_date
    and public.is_verified_driver(auth.uid())
  );

create policy "Admins manage deals"
  on public.taxi_deals for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Banner ads: public read active
create policy "Anyone views active banners"
  on public.banner_ads for select using (is_active = true);

create policy "Admins manage banners"
  on public.banner_ads for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Push subscriptions
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Point transactions (read own only; writes via service role later)
create policy "Verified drivers view own point history"
  on public.point_transactions for select to authenticated
  using (
    auth.uid() = user_id and public.is_verified_driver(auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.driver_alerts;

-- -----------------------------------------------------------------------------
-- Seed sample banner placeholder (optional — remove in production)
-- -----------------------------------------------------------------------------

-- insert into public.banner_ads (slot, title, image_url, link_url, sort_order)
-- values ('dashboard_top', 'Welcome to CabRadar', 'https://placehold.co/800x120/1a1a2e/fbbf24?text=CabRadar', null, 0);
