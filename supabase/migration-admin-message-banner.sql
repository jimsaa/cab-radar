-- Admin messaging banner redesign: message_reads with read_at acknowledgment.
-- Safe to re-run. Renames legacy tables if present.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'admin_messages'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'messages'
  ) then
    alter table public.admin_messages rename to messages;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'admin_message_deliveries'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'message_reads'
  ) then
    alter table public.admin_message_deliveries rename to message_reads;
  end if;
end $$;

-- Fresh installs (no prior migration): create canonical tables.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) between 1 and 300),
  sender_admin_id uuid not null references auth.users (id) on delete cascade,
  recipient_type text not null check (recipient_type in ('all', 'user')),
  recipient_user_id uuid references auth.users (id) on delete set null,
  important boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_user_recipient check (
    (recipient_type = 'user' and recipient_user_id is not null)
    or (recipient_type = 'all' and recipient_user_id is null)
  )
);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

-- Legacy column rename (dismissed_at → read_at).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'message_reads'
      and column_name = 'dismissed_at'
  ) then
    alter table public.message_reads rename column dismissed_at to read_at;
  end if;
end $$;

drop index if exists admin_message_deliveries_user_pending_idx;
drop index if exists message_reads_user_pending_idx;

create index if not exists message_reads_user_unread_idx
  on public.message_reads (user_id, read_at)
  where read_at is null;

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

drop policy if exists "Users read messages delivered to them" on public.messages;
drop policy if exists "Users read messages delivered to them" on public.admin_messages;
create policy "Users read messages delivered to them"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.message_reads r
      where r.message_id = id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read admin messages" on public.messages;
drop policy if exists "Admins read admin messages" on public.admin_messages;
create policy "Admins read admin messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Users read own message deliveries" on public.message_reads;
drop policy if exists "Users read own message reads" on public.message_reads;
create policy "Users read own message reads"
  on public.message_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users dismiss own message deliveries" on public.message_reads;
drop policy if exists "Users mark own message reads" on public.message_reads;
create policy "Users mark own message reads"
  on public.message_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.messages is 'Operational admin broadcast messages to drivers (taxi radio)';
comment on table public.message_reads is 'Per-driver read acknowledgment for admin messages';
