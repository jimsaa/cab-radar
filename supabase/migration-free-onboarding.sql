-- CabRadar free onboarding: auto-verify + free membership + test mode on signup.
-- Also ensures partner_leads exists for advertiser contact form.
-- Safe to re-run. Run in Supabase SQL Editor.

-- ========== membership_type: free ==========
DO $$
BEGIN
  ALTER TYPE public.membership_type ADD VALUE IF NOT EXISTS 'free';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS test_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_pending boolean NOT NULL DEFAULT false;

-- ========== Auto-activate new drivers ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    nickname,
    phone_number,
    driver_license_number,
    cabradar_user_id,
    verification_status,
    membership_type,
    test_mode_enabled,
    verified_at,
    welcome_pending
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'driver_license_number'), ''),
    public.generate_cabradar_user_id(),
    'verified',
    'free',
    true,
    now(),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== Preserve free + tesla_beta during recalculation ==========
CREATE OR REPLACE FUNCTION public.recalculate_membership(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF coalesce(p.tesla_beta, false) THEN
    UPDATE public.profiles
    SET membership_type = 'tesla_beta', updated_at = now()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  IF p.membership_type = 'free' THEN
    RETURN;
  END IF;

  IF p.is_admin OR coalesce(p.beta_user, false) THEN
    UPDATE public.profiles
    SET membership_type = 'active_driver', updated_at = now()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  IF p.verification_status <> 'verified' THEN
    UPDATE public.profiles
    SET membership_type = 'inactive', updated_at = now()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  IF p.membership_type = 'annual_member'
     AND p.membership_expires_at IS NOT NULL
     AND p.membership_expires_at > now() THEN
    RETURN;
  END IF;

  IF public.meets_contribution_requirements(
    p.monthly_reports_count,
    p.monthly_votes_count,
    p.monthly_points
  ) THEN
    UPDATE public.profiles
    SET membership_type = 'active_driver', updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET
      membership_type = 'inactive',
      membership_expires_at = CASE
        WHEN membership_type = 'annual_member' THEN membership_expires_at
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- ========== Access includes free ==========
CREATE OR REPLACE FUNCTION public.has_cabrador_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND (
        p.is_admin
        OR coalesce(p.beta_user, false)
        OR coalesce(p.tesla_beta, false)
        OR (
          p.verification_status = 'verified'
          AND (
            p.membership_type = 'free'
            OR p.membership_type = 'active_driver'
            OR p.membership_type = 'tesla_beta'
            OR (
              p.membership_type = 'annual_member'
              AND p.membership_expires_at IS NOT NULL
              AND p.membership_expires_at > now()
            )
          )
        )
      )
  );
$$;

-- Monthly reset must not demote free members
CREATE OR REPLACE FUNCTION public.run_monthly_membership_reset()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start date := date_trunc('month', now())::date;
  affected integer;
BEGIN
  UPDATE public.profiles
  SET
    monthly_reports_count = 0,
    monthly_votes_count = 0,
    monthly_points = 0,
    last_monthly_reset = month_start,
    updated_at = now()
  WHERE last_monthly_reset < month_start
     OR last_monthly_reset IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;

  UPDATE public.profiles p
  SET membership_type = 'inactive', updated_at = now()
  WHERE NOT p.is_admin
    AND p.verification_status = 'verified'
    AND p.membership_type IS DISTINCT FROM 'free'
    AND p.membership_type IS DISTINCT FROM 'tesla_beta'
    AND NOT coalesce(p.tesla_beta, false)
    AND NOT coalesce(p.beta_user, false)
    AND NOT (
      p.membership_type = 'annual_member'
      AND p.membership_expires_at IS NOT NULL
      AND p.membership_expires_at > now()
    );

  RETURN affected;
END;
$$;

-- ========== Partner leads (advertiser contact) ==========
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      text NOT NULL,
  contact_person    text NOT NULL,
  phone             text NOT NULL,
  email             text,
  offer_description text NOT NULL,
  status            text NOT NULL DEFAULT 'ny'
    CHECK (status IN ('ny', 'behandlas', 'klar')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_leads_status_idx ON public.partner_leads (status);
CREATE INDEX IF NOT EXISTS partner_leads_created_at_idx ON public.partner_leads (created_at DESC);

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view partner leads" ON public.partner_leads;
CREATE POLICY "Admins view partner leads"
  ON public.partner_leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "Admins update partner leads" ON public.partner_leads;
CREATE POLICY "Admins update partner leads"
  ON public.partner_leads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

SELECT pg_notify('pgrst', 'reload schema');
