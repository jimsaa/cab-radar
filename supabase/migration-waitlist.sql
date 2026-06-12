-- Waitlist for coming-soon interest signups.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  source text not null default 'coming_soon',
  constraint waitlist_email_length check (char_length(email) between 5 and 320)
);

create unique index if not exists waitlist_email_source_key
  on public.waitlist (lower(email), source);

comment on table public.waitlist is
  'Email interest list — coming soon page and future campaigns';

alter table public.waitlist enable row level security;

drop policy if exists "Public can join waitlist" on public.waitlist;
create policy "Public can join waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (source = 'coming_soon');

drop policy if exists "Admins read waitlist" on public.waitlist;
create policy "Admins read waitlist"
  on public.waitlist for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );
