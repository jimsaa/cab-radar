-- =============================================================================
-- CabRadar — Migration for existing Supabase projects
-- =============================================================================
-- Use this INSTEAD of schema.sql when public.profiles already exists
-- (e.g. shared project with CanTrove / Haunted Sweden / other apps).
--
-- Safe to re-run (idempotent).
-- =============================================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Enums (skip if already created)
-- -----------------------------------------------------------------------------

do $$ begin
  create type public.alert_type as enum (
    'slow_traffic', 'total_stop_accident', 'roadwork', 'hazard_on_road',
    'unsafe_pickup_area', 'taxi_queue_hotspot', 'ev_charger',
    'restroom_break', 'general_driver_tip'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_status as enum (
    'pending_review', 'active', 'expired', 'removed', 'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.banner_slot as enum (
    'dashboard_top', 'deals_page', 'alert_feed'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Extend existing profiles (do NOT create the table)
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists fab_enabled boolean not null default true,
  add column if not exists alert_chime_enabled boolean not null default true,
  add column if not exists reputation_score integer not null default 0,
  add column if not exists report_usefulness_score numeric(8, 2) not null default 0,
  add column if not exists total_approved_reports integer not null default 0,
  add column if not exists reward_points_balance integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Sync is_admin from CanTrove-style role column when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    update public.profiles
    set is_admin = true
    where role = 'admin' and is_admin = false;
  end if;
end $$;

comment on column public.profiles.reward_points_balance is 'CabRadar: future reward points — not active in v1';

-- Do NOT replace handle_new_user() — other apps may own that trigger.
-- New CabRadar columns use defaults on insert from existing signup flows.

-- -----------------------------------------------------------------------------
-- CabRadar tables
-- -----------------------------------------------------------------------------

create table if not exists public.driver_alerts (
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
  updated_at      timestamptz not null default now()
);

-- Add constraints only if table was just created (ignore if already present)
do $$ begin
  alter table public.driver_alerts
    add constraint driver_alerts_title_length check (char_length(title) between 2 and 120);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.driver_alerts
    add constraint driver_alerts_lat_range check (latitude is null or latitude between -90 and 90);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.driver_alerts
    add constraint driver_alerts_lng_range check (longitude is null or longitude between -180 and 180);
exception when duplicate_object then null;
end $$;

create index if not exists driver_alerts_status_idx on public.driver_alerts (status);
create index if not exists driver_alerts_type_idx on public.driver_alerts (type);
create index if not exists driver_alerts_created_at_idx on public.driver_alerts (created_at desc);
create index if not exists driver_alerts_expires_at_idx on public.driver_alerts (expires_at);
create index if not exists driver_alerts_location_idx on public.driver_alerts (latitude, longitude)
  where latitude is not null and longitude is not null;

create table if not exists public.alert_votes (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid not null references public.driver_alerts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       smallint not null,
  created_at timestamptz not null default now(),
  unique (alert_id, user_id)
);

do $$ begin
  alter table public.alert_votes add constraint alert_votes_value check (vote in (-1, 1));
exception when duplicate_object then null;
end $$;

create table if not exists public.taxi_deals (
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

create index if not exists taxi_deals_active_idx on public.taxi_deals (is_active, valid_until desc);

create table if not exists public.banner_ads (
  id          uuid primary key default gen_random_uuid(),
  slot        public.banner_slot not null,
  title       text not null default '',
  image_url   text not null,
  link_url    text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$ begin
  alter table public.banner_ads add constraint banner_ads_slot_sort_order_key unique (slot, sort_order);
exception when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.point_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  alert_id    uuid references public.driver_alerts (id) on delete set null,
  points      integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

create or replace function public.alert_requires_admin_approval(t public.alert_type)
returns boolean language sql immutable as $$
  select t in ('unsafe_pickup_area', 'general_driver_tip');
$$;

create or replace function public.set_alert_defaults()
returns trigger language plpgsql as $$
begin
  if public.alert_requires_admin_approval(new.type) then
    new.status := 'pending_review';
    new.admin_verified := false;
  else
    new.status := 'active';
    new.admin_verified := true;
  end if;

  new.expires_at := case new.type
    when 'slow_traffic' then now() + interval '2 hours'
    when 'total_stop_accident' then now() + interval '3 hours'
    when 'roadwork' then now() + interval '24 hours'
    when 'hazard_on_road' then now() + interval '4 hours'
    when 'unsafe_pickup_area' then now() + interval '7 days'
    when 'taxi_queue_hotspot' then now() + interval '6 hours'
    when 'ev_charger' then now() + interval '30 days'
    when 'restroom_break' then now() + interval '30 days'
    when 'general_driver_tip' then now() + interval '14 days'
    else now() + interval '4 hours'
  end;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_alert_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
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

create or replace function public.expire_stale_alerts()
returns void language sql security definer set search_path = public as $$
  update public.driver_alerts
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at < now();
$$;

-- -----------------------------------------------------------------------------
-- Triggers (CabRadar-specific names)
-- -----------------------------------------------------------------------------

drop trigger if exists cabradar_driver_alerts_before_insert on public.driver_alerts;
create trigger cabradar_driver_alerts_before_insert
  before insert on public.driver_alerts
  for each row execute function public.set_alert_defaults();

drop trigger if exists cabradar_alert_votes_after_change on public.alert_votes;
create trigger cabradar_alert_votes_after_change
  after insert or update or delete on public.alert_votes
  for each row execute function public.sync_alert_vote_counts();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.driver_alerts enable row level security;
alter table public.alert_votes enable row level security;
alter table public.taxi_deals enable row level security;
alter table public.banner_ads enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.point_transactions enable row level security;

drop policy if exists "CabRadar view active verified alerts" on public.driver_alerts;
create policy "CabRadar view active verified alerts"
  on public.driver_alerts for select using (
    (status = 'active' and admin_verified = true)
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar authenticated create alerts" on public.driver_alerts;
create policy "CabRadar authenticated create alerts"
  on public.driver_alerts for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "CabRadar authors update alerts" on public.driver_alerts;
create policy "CabRadar authors update alerts"
  on public.driver_alerts for update to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar admins delete alerts" on public.driver_alerts;
create policy "CabRadar admins delete alerts"
  on public.driver_alerts for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar view votes" on public.alert_votes;
create policy "CabRadar view votes"
  on public.alert_votes for select to authenticated using (true);

drop policy if exists "CabRadar insert votes" on public.alert_votes;
create policy "CabRadar insert votes"
  on public.alert_votes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "CabRadar update votes" on public.alert_votes;
create policy "CabRadar update votes"
  on public.alert_votes for update to authenticated using (auth.uid() = user_id);

drop policy if exists "CabRadar delete votes" on public.alert_votes;
create policy "CabRadar delete votes"
  on public.alert_votes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "CabRadar view active deals" on public.taxi_deals;
create policy "CabRadar view active deals"
  on public.taxi_deals for select using (is_active = true and valid_until >= current_date);

drop policy if exists "CabRadar admins manage deals" on public.taxi_deals;
create policy "CabRadar admins manage deals"
  on public.taxi_deals for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar view active banners" on public.banner_ads;
create policy "CabRadar view active banners"
  on public.banner_ads for select using (is_active = true);

drop policy if exists "CabRadar admins manage banners" on public.banner_ads;
create policy "CabRadar admins manage banners"
  on public.banner_ads for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar push subscriptions" on public.push_subscriptions;
create policy "CabRadar push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "CabRadar view own points" on public.point_transactions;
create policy "CabRadar view own points"
  on public.point_transactions for select to authenticated
  using (auth.uid() = user_id);

-- CabRadar profile columns — allow authenticated users to read/update CabRadar fields
drop policy if exists "CabRadar profiles select" on public.profiles;
create policy "CabRadar profiles select"
  on public.profiles for select to authenticated using (true);

drop policy if exists "CabRadar profiles update own" on public.profiles;
create policy "CabRadar profiles update own"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Realtime (skip if already added)
-- -----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.driver_alerts;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- Promote admin (run manually with your user id):
-- update public.profiles set is_admin = true, role = 'admin' where id = '<uuid>';
