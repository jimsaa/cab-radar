-- Civilkoll: internal observation register for vehicle registration numbers.

create table if not exists public.civilkoll_entries (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  last_observed_at date not null default current_date,
  approved_from_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civilkoll_entries_registration_length
    check (char_length(registration_number) between 2 and 10)
);

create unique index if not exists civilkoll_entries_registration_key
  on public.civilkoll_entries (registration_number);

comment on table public.civilkoll_entries is
  'Admin-approved Civilkoll registrations — searchable by verified drivers only';

create table if not exists public.civilkoll_submissions (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  submitter_comment text,
  admin_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civilkoll_submissions_registration_length
    check (char_length(registration_number) between 2 and 10)
);

create index if not exists civilkoll_submissions_status_idx
  on public.civilkoll_submissions (status, created_at desc);

create index if not exists civilkoll_submissions_number_idx
  on public.civilkoll_submissions (registration_number);

comment on table public.civilkoll_submissions is
  'Driver-submitted Civilkoll reports awaiting admin review — never shown in lookup';

-- updated_at triggers (reuse pattern if exists)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists civilkoll_entries_updated_at on public.civilkoll_entries;
create trigger civilkoll_entries_updated_at
  before update on public.civilkoll_entries
  for each row execute function public.set_updated_at();

drop trigger if exists civilkoll_submissions_updated_at on public.civilkoll_submissions;
create trigger civilkoll_submissions_updated_at
  before update on public.civilkoll_submissions
  for each row execute function public.set_updated_at();

alter table public.civilkoll_entries enable row level security;
alter table public.civilkoll_submissions enable row level security;

-- Approved database: verified drivers read only
drop policy if exists "Verified drivers lookup civilkoll entries" on public.civilkoll_entries;
create policy "Verified drivers lookup civilkoll entries"
  on public.civilkoll_entries for select to authenticated
  using (public.is_verified_driver(auth.uid()));

drop policy if exists "Admins manage civilkoll entries" on public.civilkoll_entries;
create policy "Admins manage civilkoll entries"
  on public.civilkoll_entries for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Submissions: drivers insert only — never read pending via client
drop policy if exists "Verified drivers submit civilkoll reports" on public.civilkoll_submissions;
create policy "Verified drivers submit civilkoll reports"
  on public.civilkoll_submissions for insert to authenticated
  with check (
    auth.uid() = submitted_by
    and public.is_verified_driver(auth.uid())
    and status = 'pending'
  );

drop policy if exists "Admins manage civilkoll submissions" on public.civilkoll_submissions;
create policy "Admins manage civilkoll submissions"
  on public.civilkoll_submissions for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Help article seed: run migration-civilkoll-help-article.sql after migration-driver-help.sql
-- Admin v2 schema: run migration-civilkoll-v2.sql after this file
