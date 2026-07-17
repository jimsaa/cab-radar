-- Unified signup trigger: CabRadar ID + nickname + phone on auth user create.
-- Free onboarding: verified + free membership + test mode (see also migration-free-onboarding.sql).
-- Safe to re-run. Run in Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS cabradar_user_id text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS driver_license_hash text,
  ADD COLUMN IF NOT EXISTS driver_license_last4 text,
  ADD COLUMN IF NOT EXISTS test_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_pending boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.generate_cabradar_user_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique CabRadar User ID';
    END IF;
    candidate := 'CR-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE cabradar_user_id = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cabradar_user_id_key
  ON public.profiles (cabradar_user_id)
  WHERE cabradar_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique
  ON public.profiles (lower(trim(nickname)))
  WHERE nickname IS NOT NULL AND trim(nickname) <> '';

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

SELECT pg_notify('pgrst', 'reload schema');
