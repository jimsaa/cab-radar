-- CabRadar Testläge: test_mode on profiles, is_test on alerts & civil submissions
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS test_mode_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.driver_alerts
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.test_mode_enabled IS
  'When true, driver reports are test-only and do not affect live network.';
COMMENT ON COLUMN public.driver_alerts.is_test IS
  'Test report — visible to creator and admins only; no push or stats.';

-- Civil submissions (v2 table name)
DO $$
BEGIN
  IF to_regclass('public.civil_submissions') IS NOT NULL THEN
    ALTER TABLE public.civil_submissions
      ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
  ELSIF to_regclass('public.civilkoll_submissions') IS NOT NULL THEN
    ALTER TABLE public.civilkoll_submissions
      ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Test alerts auto-activate (skip pending_review for training)
CREATE OR REPLACE FUNCTION public.set_alert_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(new.is_test, false) THEN
    new.status := 'active';
    new.admin_verified := true;
  ELSIF public.alert_requires_admin_approval(new.type) THEN
    new.status := 'pending_review';
    new.admin_verified := false;
  ELSE
    new.status := 'active';
    new.admin_verified := true;
  END IF;

  new.expires_at := CASE new.type
    WHEN 'slow_traffic' THEN now() + interval '30 minutes'
    WHEN 'total_stop' THEN now() + interval '60 minutes'
    WHEN 'total_stop_accident' THEN now() + interval '60 minutes'
    WHEN 'accident' THEN now() + interval '2 hours'
    WHEN 'taxi_emergency' THEN timestamptz '2099-12-31 23:59:59+00'
    WHEN 'taxi_info' THEN now() + interval '365 days'
    WHEN 'traffic_control' THEN now() + interval '2 hours'
    WHEN 'laser' THEN now() + interval '2 hours'
    WHEN 'roadwork' THEN now() + interval '24 hours'
    WHEN 'hazard_on_road' THEN now() + interval '2 hours'
    WHEN 'unsafe_pickup_area' THEN now() + interval '7 days'
    WHEN 'taxi_queue_hotspot' THEN now() + interval '6 hours'
    WHEN 'ev_charger' THEN now() + interval '365 days'
    WHEN 'restroom_break' THEN now() + interval '365 days'
    WHEN 'general_driver_tip' THEN now() + interval '14 days'
    ELSE now() + interval '2 hours'
  END;

  new.updated_at := now();
  RETURN new;
END;
$$;

-- Exclude test alerts from contribution statistics
CREATE OR REPLACE FUNCTION public.recalculate_user_monthly_contribution(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start timestamptz := date_trunc('month', now());
  report_count integer;
  vote_count integer;
  lifetime_reports integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_monthly_contribution_if_needed(p_user_id);

  SELECT count(*)::integer INTO report_count
  FROM public.driver_alerts
  WHERE created_by = p_user_id
    AND created_at >= month_start
    AND COALESCE(is_test, false) = false;

  SELECT count(*)::integer INTO vote_count
  FROM public.alert_votes v
  JOIN public.driver_alerts a ON a.id = v.alert_id
  WHERE v.user_id = p_user_id
    AND v.created_at >= month_start
    AND COALESCE(a.is_test, false) = false;

  SELECT count(*)::integer INTO lifetime_reports
  FROM public.driver_alerts
  WHERE created_by = p_user_id
    AND COALESCE(is_test, false) = false;

  UPDATE public.profiles
  SET
    monthly_reports_count = report_count,
    monthly_votes_count = vote_count,
    monthly_points = (report_count * 10) + (vote_count * 5),
    total_approved_reports = lifetime_reports,
    updated_at = now()
  WHERE id = p_user_id;

  PERFORM public.recalculate_membership(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.on_alert_submitted_for_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT'
    AND new.created_by IS NOT NULL
    AND COALESCE(new.is_test, false) = false THEN
    PERFORM public.recalculate_user_monthly_contribution(new.created_by);
  END IF;
  RETURN new;
END;
$$;

-- RLS: hide test alerts from other drivers
DROP POLICY IF EXISTS "View active verified alerts" ON public.driver_alerts;
CREATE POLICY "View active verified alerts"
  ON public.driver_alerts FOR SELECT
  USING (
    (
      status = 'active'
      AND admin_verified = true
      AND (
        COALESCE(is_test, false) = false
        OR created_by = auth.uid()
      )
    )
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  );
