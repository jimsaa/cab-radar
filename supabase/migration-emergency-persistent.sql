-- Permanent Taxi i nöd safety rules
-- Run in Supabase SQL Editor on existing projects.
--
-- RULES:
-- • taxi_emergency NEVER expires automatically
-- • expire_stale_alerts() NEVER touches taxi_emergency
-- • Only driver ("Jag är OK") or admin may close an emergency
-- • GPS movement is informational only — never auto-clears

-- Never auto-expire emergencies via cron/read hook
CREATE OR REPLACE FUNCTION public.expire_stale_alerts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.driver_alerts
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at < now()
    AND type <> 'taxi_emergency';
$$;

-- New emergencies: far-future expiry (informational column only for this type)
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

-- Repair any active emergencies that were given a short TTL by older migrations
UPDATE public.driver_alerts
SET
  expires_at = timestamptz '2099-12-31 23:59:59+00',
  updated_at = now()
WHERE type = 'taxi_emergency'
  AND status = 'active';
