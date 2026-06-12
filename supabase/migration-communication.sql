-- CabRadar — Support messages, partner leads, guest feedback
-- Run after migration-verification-v2.sql

-- Guest feedback: allow submissions without login
alter table public.user_feedback alter column user_id drop not null;
alter table public.user_feedback alter column cabradar_user_id drop not null;

-- -----------------------------------------------------------------------------
-- Support messages (logged-in drivers)
-- -----------------------------------------------------------------------------

create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  cabradar_user_id text not null,
  display_name     text,
  subject          text not null,
  message          text not null,
  app_version      text not null default '0.0.0',
  status           text not null default 'ny'
    check (status in ('ny', 'behandlas', 'klar')),
  created_at       timestamptz not null default now()
);

create index if not exists support_messages_status_idx on public.support_messages (status);
create index if not exists support_messages_created_at_idx on public.support_messages (created_at desc);
create index if not exists support_messages_cabradar_user_id_idx on public.support_messages (cabradar_user_id);

alter table public.support_messages enable row level security;

drop policy if exists "Users insert own support" on public.support_messages;
create policy "Users insert own support"
  on public.support_messages for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users view own support" on public.support_messages;
create policy "Users view own support"
  on public.support_messages for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Admins update support" on public.support_messages;
create policy "Admins update support"
  on public.support_messages for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- -----------------------------------------------------------------------------
-- Partner leads (public via API)
-- -----------------------------------------------------------------------------

create table if not exists public.partner_leads (
  id                uuid primary key default gen_random_uuid(),
  company_name      text not null,
  contact_person    text not null,
  phone             text not null,
  email             text,
  offer_description text not null,
  status            text not null default 'ny'
    check (status in ('ny', 'behandlas', 'klar')),
  created_at        timestamptz not null default now()
);

create index if not exists partner_leads_status_idx on public.partner_leads (status);
create index if not exists partner_leads_created_at_idx on public.partner_leads (created_at desc);

alter table public.partner_leads enable row level security;

drop policy if exists "Admins view partner leads" on public.partner_leads;
create policy "Admins view partner leads"
  on public.partner_leads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins update partner leads" on public.partner_leads;
create policy "Admins update partner leads"
  on public.partner_leads for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
