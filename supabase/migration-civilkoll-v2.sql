-- Civilkoll v2 — civil_registry + civil_submissions (admin management)
-- Safe to re-run. Upgrades civilkoll_* tables if present.

do $$
begin
  if to_regclass('public.civilkoll_entries') is not null
     and to_regclass('public.civil_registry') is null then
    alter table public.civilkoll_entries rename to civil_registry;
  end if;
  if to_regclass('public.civilkoll_submissions') is not null
     and to_regclass('public.civil_submissions') is null then
    alter table public.civilkoll_submissions rename to civil_submissions;
  end if;
end $$;

create table if not exists public.civil_registry (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  admin_note text,
  observation_count integer not null default 1,
  last_observed_at date not null default current_date,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  source text not null default 'user_submission'
    check (source in ('user_submission', 'admin_manual')),
  status text not null default 'approved'
    check (status in ('approved', 'removed')),
  approved_from_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civil_registry_registration_length
    check (char_length(registration_number) between 2 and 10)
);

drop index if exists public.civilkoll_entries_registration_key;
drop index if exists public.civil_registry_registration_key;

create unique index if not exists civil_registry_registration_key
  on public.civil_registry (registration_number)
  where status = 'approved';

create table if not exists public.civil_submissions (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  submitted_by uuid references public.profiles (id) on delete set null,
  comment text,
  admin_note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civil_submissions_registration_length
    check (char_length(registration_number) between 2 and 10)
);

create index if not exists civil_submissions_status_idx
  on public.civil_submissions (status, created_at desc);

create index if not exists civil_submissions_number_idx
  on public.civil_submissions (registration_number);

-- Extend registry from legacy shape
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
update public.civil_registry set observation_count = 1 where observation_count is null or observation_count < 1;

alter table public.civil_registry
  alter column source set default 'user_submission',
  alter column status set default 'approved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'civil_registry_source_check'
  ) then
    alter table public.civil_registry
      add constraint civil_registry_source_check
      check (source in ('user_submission', 'admin_manual'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'civil_registry_status_check'
  ) then
    alter table public.civil_registry
      add constraint civil_registry_status_check
      check (status in ('approved', 'removed'));
  end if;
end $$;

-- Submissions: rename legacy columns
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'civil_submissions'
      and column_name = 'submitter_comment'
  ) then
    alter table public.civil_submissions rename column submitter_comment to comment;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'civil_submissions'
      and column_name = 'admin_notes'
  ) then
    alter table public.civil_submissions rename column admin_notes to admin_note;
  end if;
end $$;

alter table public.civil_submissions
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists civil_registry_updated_at on public.civil_registry;
create trigger civil_registry_updated_at
  before update on public.civil_registry
  for each row execute function public.set_updated_at();

drop trigger if exists civil_submissions_updated_at on public.civil_submissions;
create trigger civil_submissions_updated_at
  before update on public.civil_submissions
  for each row execute function public.set_updated_at();

alter table public.civil_registry enable row level security;
alter table public.civil_submissions enable row level security;

drop policy if exists "Verified drivers lookup civilkoll entries" on public.civil_registry;
drop policy if exists "Admins manage civilkoll entries" on public.civil_registry;
drop policy if exists "Verified drivers lookup civil registry" on public.civil_registry;
create policy "Verified drivers lookup civil registry"
  on public.civil_registry for select to authenticated
  using (
    status = 'approved'
    and public.is_verified_driver(auth.uid())
  );

drop policy if exists "Admins manage civil registry" on public.civil_registry;
create policy "Admins manage civil registry"
  on public.civil_registry for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Verified drivers submit civilkoll reports" on public.civil_submissions;
drop policy if exists "Admins manage civilkoll submissions" on public.civil_submissions;
drop policy if exists "Verified drivers submit civil submissions" on public.civil_submissions;
create policy "Verified drivers submit civil submissions"
  on public.civil_submissions for insert to authenticated
  with check (
    auth.uid() = submitted_by
    and public.is_verified_driver(auth.uid())
    and status = 'pending'
  );

drop policy if exists "Admins manage civil submissions" on public.civil_submissions;
create policy "Admins manage civil submissions"
  on public.civil_submissions for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Legacy policy cleanup on old table names (if rename skipped)
drop policy if exists "Verified drivers lookup civilkoll entries" on public.civilkoll_entries;
drop policy if exists "Admins manage civilkoll entries" on public.civilkoll_entries;
