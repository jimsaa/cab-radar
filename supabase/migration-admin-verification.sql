-- Admin driver verification: verified_at timestamp + RLS for admin updates
alter table public.profiles
  add column if not exists verified_at timestamptz;

comment on column public.profiles.verified_at is 'Set when admin approves driver verification';

-- Admins may update any profile (including verification_status, verified_at)
drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Non-admins cannot change verification fields on their own profile
create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select is_admin into actor_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_admin, false) then
    return new;
  end if;

  new.verification_status := old.verification_status;
  new.is_admin := old.is_admin;
  new.reward_points_balance := old.reward_points_balance;
  new.reputation_score := old.reputation_score;
  new.report_usefulness_score := old.report_usefulness_score;
  new.total_approved_reports := old.total_approved_reports;

  if to_jsonb(new) ? 'verified_at' then
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists cabradar_protect_profile_fields on public.profiles;
create trigger cabradar_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_verification_fields();
