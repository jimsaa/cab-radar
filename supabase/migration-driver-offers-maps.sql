-- Google Maps fields for driver offers (Erbjudanden).
-- Safe to re-run.

alter table public.taxi_deals
  add column if not exists google_maps_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.taxi_deals.google_maps_url is 'Direct Google Maps link for drivers; overrides generated links';
comment on column public.taxi_deals.latitude is 'Optional partner latitude for map navigation';
comment on column public.taxi_deals.longitude is 'Optional partner longitude for map navigation';
