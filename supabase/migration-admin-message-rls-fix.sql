-- Fix RLS so drivers can read their own admin messages via authenticated JWT.
-- Safe to re-run. Run if inbox API returns message:null but SQL shows unread rows.

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

drop policy if exists "Users read messages delivered to them" on public.messages;
create policy "Users read messages delivered to them"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.message_reads r
      where r.message_id = messages.id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read admin messages" on public.messages;
create policy "Admins read admin messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Users read own message reads" on public.message_reads;
create policy "Users read own message reads"
  on public.message_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users mark own message reads" on public.message_reads;
create policy "Users mark own message reads"
  on public.message_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
