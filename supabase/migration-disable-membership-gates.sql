-- Disable membership gating at RLS level.
-- All verified drivers get full CabRadar access (free model).
-- Membership columns/functions remain for a future premium module.
-- Safe to re-run.

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
        OR p.verification_status = 'verified'
      )
  );
$$;

SELECT pg_notify('pgrst', 'reload schema');
