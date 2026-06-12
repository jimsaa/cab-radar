-- Allow "Snabb Civil" quick-add source on Tesla admin dashboard.
-- Safe to re-run.

alter table public.civil_registry
  drop constraint if exists civil_registry_source_check;

alter table public.civil_registry
  add constraint civil_registry_source_check
  check (source in ('user_submission', 'admin_manual', 'admin_quick'));
