-- Emergency admin visibility: co-admins must read active taxi_emergency alerts.
-- Safe to re-run.

drop policy if exists "Members view active verified alerts" on public.driver_alerts;
drop policy if exists "View active verified alerts" on public.driver_alerts;

create policy "Members view active verified alerts"
  on public.driver_alerts for select to authenticated
  using (
    public.has_cabrador_access(auth.uid())
    and (
      (status = 'active' and admin_verified = true)
      or created_by = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
      or (
        type = 'taxi_emergency'
        and status = 'active'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_co_admin
        )
      )
    )
  );

-- Ensure active emergencies are admin-verified (matches badge + admin page queries)
update public.driver_alerts
set admin_verified = true, updated_at = now()
where type = 'taxi_emergency'
  and status = 'active'
  and admin_verified = false;
