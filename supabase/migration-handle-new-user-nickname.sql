-- Copy nickname from auth metadata when profiles are auto-created on signup.
-- Safe to re-run. Prefer migration-signup-unified-trigger.sql for new deployments.

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
    verification_status
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'driver_license_number'), ''),
    public.generate_cabradar_user_id(),
    'pending_verification'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Backfill profiles missing nickname from auth.users metadata (e.g. Tesla Beta signups).
UPDATE public.profiles p
SET nickname = trim(u.raw_user_meta_data ->> 'nickname'),
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (p.nickname IS NULL OR trim(p.nickname) = '')
  AND u.raw_user_meta_data ->> 'nickname' IS NOT NULL
  AND trim(u.raw_user_meta_data ->> 'nickname') <> '';
