-- LIVE feed TTL fix: all operational reports expire 15 minutes after created_at.
-- taxi_emergency never auto-expires (admin/driver resolve only).
-- Run in Supabase SQL Editor on existing projects.

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

-- Expire by created_at age OR past expires_at (never touches taxi_emergency)
CREATE OR REPLACE FUNCTION public.expire_stale_alerts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.driver_alerts
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND type <> 'taxi_emergency'
    AND (
      expires_at < now()
      OR created_at + public.alert_ttl_interval(type) < now()
    );
$$;

-- Repair active operational alerts that still carry long TTLs from older migrations
UPDATE public.driver_alerts
SET
  expires_at = created_at + public.alert_ttl_interval(type),
  updated_at = now()
WHERE status = 'active'
  AND type IN (
    'traffic_control',
    'laser',
    'all_vehicle_check',
    'slow_traffic',
    'total_stop',
    'total_stop_accident',
    'accident',
    'hazard_on_road'
  );

-- Emergencies keep far-future expiry (informational column only)
UPDATE public.driver_alerts
SET
  expires_at = timestamptz '2099-12-31 23:59:59+00',
  updated_at = now()
WHERE type = 'taxi_emergency'
  AND status = 'active';

-- Immediately expire operational reports already older than 15 minutes
UPDATE public.driver_alerts
SET status = 'expired', updated_at = now()
WHERE status = 'active'
  AND type <> 'taxi_emergency'
  AND created_at + public.alert_ttl_interval(type) < now();
