-- Driver nicknames for public privacy (display_name remains real/legal name for admins).
-- Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

COMMENT ON COLUMN public.profiles.nickname IS
  'Public display name shown to other drivers. Real name stays in display_name (admin only).';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique
  ON public.profiles (lower(trim(nickname)))
  WHERE nickname IS NOT NULL AND trim(nickname) <> '';

-- Backfill existing users from Taxi Leg last4
UPDATE public.profiles p
SET nickname = 'Taxi ' || p.driver_license_last4
WHERE p.nickname IS NULL
  AND p.driver_license_last4 IS NOT NULL
  AND trim(p.driver_license_last4) <> '';

-- Resolve duplicate generated nicknames by appending a short suffix
DO $$
DECLARE
  rec RECORD;
  suffix int;
  candidate text;
BEGIN
  FOR rec IN
    SELECT id, nickname, driver_license_last4
    FROM public.profiles
    WHERE nickname IS NOT NULL
      AND id NOT IN (
        SELECT DISTINCT ON (lower(trim(nickname))) id
        FROM public.profiles
        WHERE nickname IS NOT NULL AND trim(nickname) <> ''
        ORDER BY lower(trim(nickname)), created_at ASC NULLS LAST, id ASC
      )
  LOOP
    suffix := 2;
    LOOP
      candidate := rec.nickname || ' ' || suffix::text;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE lower(trim(nickname)) = lower(trim(candidate))
          AND id <> rec.id
      );
      suffix := suffix + 1;
    END LOOP;
    UPDATE public.profiles SET nickname = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Fallback for profiles still missing nickname
UPDATE public.profiles p
SET nickname = 'Förare ' || upper(substr(replace(p.id::text, '-', ''), 1, 6))
WHERE p.nickname IS NULL OR trim(p.nickname) = '';

-- Protect real name from self-service edits; nickname remains user-editable
CREATE OR REPLACE FUNCTION public.protect_profile_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN new;
  END IF;

  SELECT is_admin INTO actor_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF coalesce(actor_is_admin, false) THEN
    RETURN new;
  END IF;

  new.verification_status := old.verification_status;
  new.is_admin := old.is_admin;
  new.is_co_admin := old.is_co_admin;
  new.co_admin_emergency_call := old.co_admin_emergency_call;
  new.cabradar_user_id := old.cabradar_user_id;
  new.membership_type := old.membership_type;
  new.membership_expires_at := old.membership_expires_at;
  new.monthly_reports_count := old.monthly_reports_count;
  new.monthly_votes_count := old.monthly_votes_count;
  new.monthly_points := old.monthly_points;
  new.last_monthly_reset := old.last_monthly_reset;
  new.stripe_customer_id := old.stripe_customer_id;
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;
  new.beta_user := old.beta_user;
  new.display_name := old.display_name;

  IF to_jsonb(old) ? 'driver_license_number' THEN
    new.driver_license_number := old.driver_license_number;
  END IF;
  IF to_jsonb(old) ? 'driver_license_hash' THEN
    new.driver_license_hash := old.driver_license_hash;
  END IF;
  IF to_jsonb(old) ? 'driver_license_last4' THEN
    new.driver_license_last4 := old.driver_license_last4;
  END IF;
  IF to_jsonb(old) ? 'verified_at' THEN
    new.verified_at := old.verified_at;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS cabradar_protect_profile_fields ON public.profiles;
CREATE TRIGGER cabradar_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verification_fields();
