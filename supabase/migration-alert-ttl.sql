-- Per-type TTL for driver alerts + extend on duplicate confirmation.
-- Run in Supabase SQL Editor on existing projects.
--
-- TTL (active in LIVE):
--   traffic_control, laser, slow_traffic, total_stop → 15 min
--   accident → 60 min
--   taxi_emergency → never auto-expire (manual close only)
--   taxi_info, legacy types → unchanged / long-lived

CREATE OR REPLACE FUNCTION public.alert_ttl_interval(p_type text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'traffic_control' THEN interval '15 minutes'
    WHEN 'laser' THEN interval '15 minutes'
    WHEN 'slow_traffic' THEN interval '15 minutes'
    WHEN 'total_stop' THEN interval '15 minutes'
    WHEN 'total_stop_accident' THEN interval '15 minutes'
    WHEN 'accident' THEN interval '60 minutes'
    WHEN 'hazard_on_road' THEN interval '60 minutes'
    WHEN 'taxi_emergency' THEN interval '100 years'
    WHEN 'taxi_info' THEN interval '365 days'
    WHEN 'roadwork' THEN interval '24 hours'
    WHEN 'unsafe_pickup_area' THEN interval '7 days'
    WHEN 'taxi_queue_hotspot' THEN interval '6 hours'
    WHEN 'ev_charger' THEN interval '365 days'
    WHEN 'restroom_break' THEN interval '365 days'
    WHEN 'general_driver_tip' THEN interval '14 days'
    ELSE interval '15 minutes'
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_alert_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.alert_requires_admin_approval(new.type) THEN
    new.status := 'pending_review';
    new.admin_verified := false;
  ELSE
    new.status := 'active';
    new.admin_verified := true;
  END IF;

  new.expires_at := now() + public.alert_ttl_interval(new.type);
  new.updated_at := now();
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_alert_ttl(p_alert_id uuid)
RETURNS public.driver_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.driver_alerts%rowtype;
BEGIN
  SELECT * INTO result
  FROM public.driver_alerts
  WHERE id = p_alert_id
  FOR UPDATE;

  IF NOT FOUND OR result.status <> 'active' THEN
    RAISE EXCEPTION 'Varningen är inte längre aktiv';
  END IF;

  IF result.type = 'taxi_emergency' THEN
    RAISE EXCEPTION 'Nödlarm kan inte förlängas på detta sätt';
  END IF;

  UPDATE public.driver_alerts
  SET
    expires_at = now() + public.alert_ttl_interval(result.type),
    updated_at = now()
  WHERE id = p_alert_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.extend_alert_ttl(uuid) IS
  'Driver confirms a nearby duplicate — reset expires_at from now per alert type TTL.';

-- Repair active alerts that still carry old long TTLs from prior migrations
UPDATE public.driver_alerts
SET
  expires_at = now() + public.alert_ttl_interval(type),
  updated_at = now()
WHERE status = 'active'
  AND type IN ('traffic_control', 'laser', 'slow_traffic', 'total_stop', 'accident');

-- Emergencies keep far-future expiry
UPDATE public.driver_alerts
SET
  expires_at = timestamptz '2099-12-31 23:59:59+00',
  updated_at = now()
WHERE type = 'taxi_emergency'
  AND status = 'active';
