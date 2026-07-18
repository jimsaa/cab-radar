-- Country-aware platform foundation.
-- Sweden (SE) is the default. Existing rows get SE automatically.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'SE';

COMMENT ON COLUMN public.profiles.country_code IS
  'ISO 3166-1 Alpha-2. Default SE. Used for config, i18n, and validation.';

CREATE INDEX IF NOT EXISTS profiles_country_code_idx
  ON public.profiles (country_code);

-- ---------------------------------------------------------------------------
-- Driver alerts / reports
-- ---------------------------------------------------------------------------
ALTER TABLE public.driver_alerts
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'SE';

COMMENT ON COLUMN public.driver_alerts.country_code IS
  'ISO 3166-1 Alpha-2 of the report context. Default SE.';

CREATE INDEX IF NOT EXISTS driver_alerts_country_code_idx
  ON public.driver_alerts (country_code);

-- ---------------------------------------------------------------------------
-- Geo hierarchy: Country → Region → City (admin-ready, no redesign later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geo_countries (
  id            text PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  enabled       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geo_regions (
  id            text PRIMARY KEY,
  country_code  text NOT NULL REFERENCES public.geo_countries (code) ON DELETE CASCADE,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geo_regions_country_code_idx
  ON public.geo_regions (country_code);

CREATE TABLE IF NOT EXISTS public.geo_cities (
  id            text PRIMARY KEY,
  region_id     text NOT NULL REFERENCES public.geo_regions (id) ON DELETE CASCADE,
  country_code  text NOT NULL REFERENCES public.geo_countries (code) ON DELETE CASCADE,
  name          text NOT NULL,
  is_other      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geo_cities_country_code_idx
  ON public.geo_cities (country_code);
CREATE INDEX IF NOT EXISTS geo_cities_region_id_idx
  ON public.geo_cities (region_id);

ALTER TABLE public.geo_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read geo_countries" ON public.geo_countries;
CREATE POLICY "Anyone read geo_countries"
  ON public.geo_countries FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone read geo_regions" ON public.geo_regions;
CREATE POLICY "Anyone read geo_regions"
  ON public.geo_regions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone read geo_cities" ON public.geo_cities;
CREATE POLICY "Anyone read geo_cities"
  ON public.geo_cities FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage geo_countries" ON public.geo_countries;
CREATE POLICY "Admins manage geo_countries"
  ON public.geo_countries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Admins manage geo_regions" ON public.geo_regions;
CREATE POLICY "Admins manage geo_regions"
  ON public.geo_regions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Admins manage geo_cities" ON public.geo_cities;
CREATE POLICY "Admins manage geo_cities"
  ON public.geo_cities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Seed Sweden hierarchy (matches src/config/countries/se.json)
INSERT INTO public.geo_countries (id, code, name, enabled)
VALUES ('se', 'SE', 'Sweden', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, enabled = EXCLUDED.enabled;

INSERT INTO public.geo_regions (id, country_code, name) VALUES
  ('vastra-gotaland', 'SE', 'Västra Götaland'),
  ('stockholm', 'SE', 'Stockholm'),
  ('skane', 'SE', 'Skåne')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.geo_cities (id, region_id, country_code, name, is_other) VALUES
  ('goteborg', 'vastra-gotaland', 'SE', 'Göteborg', false),
  ('stockholm', 'stockholm', 'SE', 'Stockholm', false),
  ('malmo', 'skane', 'SE', 'Malmö', false),
  ('other-vg', 'vastra-gotaland', 'SE', 'Annan', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_other = EXCLUDED.is_other;

-- Stub disabled countries (config-ready, not active)
INSERT INTO public.geo_countries (id, code, name, enabled) VALUES
  ('is', 'IS', 'Iceland', false),
  ('no', 'NO', 'Norway', false)
ON CONFLICT (id) DO NOTHING;

-- Default country_code for new alerts from trigger profile
CREATE OR REPLACE FUNCTION public.set_alert_country_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.country_code IS NULL OR btrim(new.country_code) = '' THEN
    SELECT coalesce(p.country_code, 'SE')
      INTO new.country_code
      FROM public.profiles p
     WHERE p.id = new.created_by;
    IF new.country_code IS NULL OR btrim(new.country_code) = '' THEN
      new.country_code := 'SE';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS cabradar_alert_country_code ON public.driver_alerts;
CREATE TRIGGER cabradar_alert_country_code
  BEFORE INSERT ON public.driver_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_alert_country_code();

SELECT pg_notify('pgrst', 'reload schema');
