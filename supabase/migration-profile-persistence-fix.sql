-- Profile persistence fix — taxi columns + safe update trigger.
-- Safe to re-run. Run migration-protect-profile-trigger-fix.sql first if needed.

alter table public.profiles
  add column if not exists taxi_company_name text,
  add column if not exists taxi_operator text,
  add column if not exists taxi_number text,
  add column if not exists taximeter_type text;

-- Trigger definition lives in migration-protect-profile-trigger-fix.sql
-- (included in migration-contribution-tracking-fix.sql preamble as well).

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
