-- Last-known driver location for nearby Taxi i nöd push targeting.
alter table public.profiles
  add column if not exists last_known_latitude double precision,
  add column if not exists last_known_longitude double precision,
  add column if not exists last_known_at timestamptz;

comment on column public.profiles.last_known_latitude is
  'Approximate presence for nearby emergency push — never shown to other drivers';
comment on column public.profiles.last_known_longitude is
  'Approximate presence for nearby emergency push — never shown to other drivers';
comment on column public.profiles.last_known_at is
  'When last_known coordinates were updated (stale after ~30 min for push)';
