-- Adds distinct `laser` alert type (separate from traffic_control / Taxikontroll).
-- Run in Supabase SQL Editor on existing projects.

ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'laser';

-- Extend expiry defaults for laser (same TTL as traffic_control)
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
