-- Nickname save fix — column + RLS for self-service updates.
-- Safe to re-run. (CabRadar uses public.profiles, not user_profiles.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

COMMENT ON COLUMN public.profiles.nickname IS
  'Public display name shown to other drivers. Real name stays in display_name (admin only).';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique
  ON public.profiles (lower(trim(nickname)))
  WHERE nickname IS NOT NULL AND trim(nickname) <> '';

-- Authenticated users may update their own profile row (nickname, settings, etc.)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
