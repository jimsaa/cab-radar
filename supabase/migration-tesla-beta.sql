-- Tesla Beta signup — dedicated onboarding for Göteborg Tesla taxi drivers.
-- Safe to re-run.

alter table public.profiles
  add column if not exists tesla_beta boolean not null default false;

comment on column public.profiles.tesla_beta is
  'Tesla Beta tester: restricted to Tesla View, auto-approved on signup';

do $$
begin
  alter type public.membership_type add value if not exists 'tesla_beta';
exception
  when duplicate_object then null;
end $$;

-- Preserve Tesla Beta membership during recalculation
create or replace function public.recalculate_membership(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then return; end if;

  if coalesce(p.tesla_beta, false) then
    update public.profiles
    set membership_type = 'tesla_beta', updated_at = now()
    where id = p_user_id;
    return;
  end if;

  if p.is_admin or coalesce(p.beta_user, false) then
    update public.profiles
    set membership_type = 'active_driver', updated_at = now()
    where id = p_user_id;
    return;
  end if;

  if p.verification_status <> 'verified' then
    update public.profiles
    set membership_type = 'inactive', updated_at = now()
    where id = p_user_id;
    return;
  end if;

  if p.membership_type = 'annual_member'
     and p.membership_expires_at is not null
     and p.membership_expires_at > now() then
    return;
  end if;

  if public.meets_contribution_requirements(
    p.monthly_reports_count,
    p.monthly_votes_count,
    p.monthly_points
  ) then
    update public.profiles
    set membership_type = 'active_driver', updated_at = now()
    where id = p_user_id;
  else
    update public.profiles
    set
      membership_type = 'inactive',
      membership_expires_at = case
        when membership_type = 'annual_member' then membership_expires_at
        else null
      end,
      updated_at = now()
    where id = p_user_id;
  end if;
end;
$$;
