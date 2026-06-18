-- Add civil_registry v2 columns (status, source, etc.) if missing.
-- Run in Supabase SQL Editor when CivilKoll quick-add fails on missing status.
-- Safe to re-run.

alter table public.civil_registry
  add column if not exists admin_note text,
  add column if not exists observation_count integer not null default 1,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists source text,
  add column if not exists status text,
  add column if not exists approved_from_submission_id uuid;

update public.civil_registry set source = 'user_submission' where source is null;
update public.civil_registry set status = 'approved' where status is null;
update public.civil_registry set approved_at = created_at where approved_at is null;
update public.civil_registry
set observation_count = 1
where observation_count is null or observation_count < 1;

alter table public.civil_registry
  alter column source set default 'user_submission',
  alter column status set default 'approved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'civil_registry_status_check'
  ) then
    alter table public.civil_registry
      add constraint civil_registry_status_check
      check (status in ('approved', 'removed'));
  end if;
end $$;

alter table public.civil_registry
  drop constraint if exists civil_registry_source_check;

alter table public.civil_registry
  add constraint civil_registry_source_check
  check (source in ('user_submission', 'admin_manual', 'admin_quick'));

drop index if exists public.civilkoll_entries_registration_key;
drop index if exists public.civil_registry_registration_key;

create unique index if not exists civil_registry_registration_key
  on public.civil_registry (registration_number)
  where status = 'approved';
