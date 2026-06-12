-- Driver onboarding: city, national emergency preference, welcome flag
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS driver_city text,
  ADD COLUMN IF NOT EXISTS show_national_emergencies boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.driver_city IS
  'Primary operating city: Göteborg, Stockholm, Malmö, or custom text from Annan.';
COMMENT ON COLUMN public.profiles.show_national_emergencies IS
  'When true, driver sees Taxi i nöd alerts from all cities.';
COMMENT ON COLUMN public.profiles.welcome_pending IS
  'Set true on admin activation; cleared when driver dismisses welcome message.';
