-- Admin operational messaging (digital taxi radio).
-- Safe to re-run.

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) between 1 and 300),
  sender_admin_id uuid not null references auth.users (id) on delete cascade,
  recipient_type text not null check (recipient_type in ('all', 'user')),
  recipient_user_id uuid references auth.users (id) on delete set null,
  important boolean not null default false,
  created_at timestamptz not null default now(),
  constraint admin_messages_user_recipient check (
    (recipient_type = 'user' and recipient_user_id is not null)
    or (recipient_type = 'all' and recipient_user_id is null)
  )
);

create index if not exists admin_messages_created_at_idx
  on public.admin_messages (created_at desc);

create table if not exists public.admin_message_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.admin_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists admin_message_deliveries_user_pending_idx
  on public.admin_message_deliveries (user_id, dismissed_at)
  where dismissed_at is null;

alter table public.admin_messages enable row level security;
alter table public.admin_message_deliveries enable row level security;

drop policy if exists "Users read messages delivered to them" on public.admin_messages;
create policy "Users read messages delivered to them"
  on public.admin_messages for select to authenticated
  using (
    exists (
      select 1 from public.admin_message_deliveries d
      where d.message_id = id and d.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read admin messages" on public.admin_messages;
create policy "Admins read admin messages"
  on public.admin_messages for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Users read own message deliveries" on public.admin_message_deliveries;
create policy "Users read own message deliveries"
  on public.admin_message_deliveries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users dismiss own message deliveries" on public.admin_message_deliveries;
create policy "Users dismiss own message deliveries"
  on public.admin_message_deliveries for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.admin_messages is 'Operational admin broadcast messages to drivers';
comment on table public.admin_message_deliveries is 'Per-driver inbox delivery and dismiss state';
