-- Fix profiles SELECT for emergency admins (avoids RLS filtering driver identity).
-- Safe to re-run.

create or replace function public.is_emergency_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = user_id
      and (p.is_admin or coalesce(p.is_co_admin, false))
  );
$$;

grant execute on function public.is_emergency_admin(uuid) to authenticated;

drop policy if exists "Users view own profile or admin views all" on public.profiles;
drop policy if exists "CabRadar profiles select" on public.profiles;
drop policy if exists "Profiles viewable by authenticated users" on public.profiles;

create policy "Users view own profile or admin views all"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or public.is_emergency_admin(auth.uid())
  );
