-- Co-admin role: trusted delegates with Taxi i nöd access (same as admin for emergencies).
-- Full admin panel remains restricted to is_admin = true.

alter table public.profiles
  add column if not exists is_co_admin boolean not null default false;

comment on column public.profiles.is_co_admin is
  'Trusted co-admin: emergency dashboard access only (driver identity, contact, GPS).';

-- Promote a co-admin (example):
-- update public.profiles set is_co_admin = true where id = '<auth-user-uuid>';

-- Profiles: co-admins may read profiles (needed for emergency driver details).
drop policy if exists "Users view own profile or admin views all" on public.profiles;
create policy "Users view own profile or admin views all"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin or p.is_co_admin)
    )
  );

-- Driver alerts: co-admins may close active emergencies.
drop policy if exists "Authors update own alerts" on public.driver_alerts;
create policy "Authors update own alerts"
  on public.driver_alerts for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
    )
    or (
      type = 'taxi_emergency'
      and status = 'active'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_co_admin
      )
    )
  );
