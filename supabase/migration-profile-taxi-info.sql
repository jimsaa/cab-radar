-- Optional taxi profile fields (collected after signup on settings page)
alter table public.profiles
  add column if not exists taxi_company_name text,
  add column if not exists taxi_operator text,
  add column if not exists taxi_number text,
  add column if not exists taximeter_type text;

comment on column public.profiles.taxi_company_name is 'Optional: driver own taxi company';
comment on column public.profiles.taxi_operator is 'Optional: primary operator (e.g. Taxi Göteborg, Uber)';
comment on column public.profiles.taxi_number is 'Optional: vehicle taxi number';
comment on column public.profiles.taximeter_type is 'Optional: taximeter brand (M2, Halda, etc.)';
