-- Anonymous driver activity points for admin situational awareness (not live tracking).
-- Run in Supabase SQL Editor after prior migrations.

CREATE TABLE IF NOT EXISTS public.driver_activity_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_activity_points_recorded_at_idx
  ON public.driver_activity_points (recorded_at DESC);

COMMENT ON TABLE public.driver_activity_points IS
  'Anonymized activity dots for admin map — no PII exposed in admin UI.';

ALTER TABLE public.driver_activity_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified drivers insert own activity"
  ON public.driver_activity_points;
DROP POLICY IF EXISTS "Admins read activity points"
  ON public.driver_activity_points;
DROP POLICY IF EXISTS "Drivers cannot read activity points"
  ON public.driver_activity_points;

-- Verified drivers insert their own activity (event-driven, never polled).
CREATE POLICY "Verified drivers insert own activity"
  ON public.driver_activity_points FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.verification_status = 'verified'
        AND NOT p.is_admin
    )
  );

-- Full admins read coordinates (API returns lat/lng only — no user_id).
CREATE POLICY "Admins read activity points"
  ON public.driver_activity_points FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

COMMENT ON COLUMN public.profiles.last_known_latitude IS
  'Last natural-interaction location for nearby emergency push — not live tracking';
COMMENT ON COLUMN public.profiles.last_known_longitude IS
  'Last natural-interaction location for nearby emergency push — not live tracking';
COMMENT ON COLUMN public.profiles.last_known_at IS
  'When last_known coordinates were updated via login, report, Civilkoll, etc.';
