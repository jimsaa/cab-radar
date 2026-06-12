-- CabRadar — Alert categories v2 — STEP 2 of 2
-- Run AFTER migration-alert-categories.sql has completed successfully.

-- Map legacy rows to closest new category
UPDATE public.driver_alerts SET type = 'total_stop' WHERE type = 'total_stop_accident';
UPDATE public.driver_alerts SET type = 'accident' WHERE type = 'hazard_on_road';
UPDATE public.driver_alerts SET type = 'traffic_control' WHERE type = 'roadwork';
UPDATE public.driver_alerts SET type = 'taxi_info' WHERE type IN (
  'general_driver_tip',
  'unsafe_pickup_area',
  'ev_charger',
  'restroom_break',
  'taxi_queue_hotspot'
);

CREATE OR REPLACE FUNCTION public.alert_requires_admin_approval(t public.alert_type)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT t IN ('taxi_info', 'unsafe_pickup_area', 'general_driver_tip');
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

  new.expires_at := CASE new.type
    WHEN 'slow_traffic' THEN now() + interval '2 hours'
    WHEN 'total_stop' THEN now() + interval '3 hours'
    WHEN 'total_stop_accident' THEN now() + interval '3 hours'
    WHEN 'accident' THEN now() + interval '4 hours'
    WHEN 'taxi_emergency' THEN now() + interval '2 hours'
    WHEN 'taxi_info' THEN now() + interval '14 days'
    WHEN 'traffic_control' THEN now() + interval '4 hours'
    WHEN 'roadwork' THEN now() + interval '24 hours'
    WHEN 'hazard_on_road' THEN now() + interval '4 hours'
    WHEN 'unsafe_pickup_area' THEN now() + interval '7 days'
    WHEN 'taxi_queue_hotspot' THEN now() + interval '6 hours'
    WHEN 'ev_charger' THEN now() + interval '30 days'
    WHEN 'restroom_break' THEN now() + interval '30 days'
    WHEN 'general_driver_tip' THEN now() + interval '14 days'
    ELSE now() + interval '4 hours'
  END;

  RETURN new;
END;
$$;
