-- Adds `all_vehicle_check` alert type (authority checkpoint — all vehicles stopped).
-- Run in Supabase SQL Editor on existing projects.

ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'all_vehicle_check';

CREATE OR REPLACE FUNCTION public.alert_ttl_interval(p_type text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'traffic_control' THEN interval '15 minutes'
    WHEN 'laser' THEN interval '15 minutes'
    WHEN 'all_vehicle_check' THEN interval '15 minutes'
    WHEN 'slow_traffic' THEN interval '15 minutes'
    WHEN 'total_stop' THEN interval '15 minutes'
    WHEN 'total_stop_accident' THEN interval '15 minutes'
    WHEN 'accident' THEN interval '15 minutes'
    WHEN 'hazard_on_road' THEN interval '15 minutes'
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

  new.expires_at := now() + public.alert_ttl_interval(new.type::text);
  new.updated_at := now();
  RETURN new;
END;
$$;

NOTIFY pgrst, 'reload schema';
