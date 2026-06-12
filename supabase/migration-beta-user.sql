-- Beta User — unrestricted access during beta period (admin-granted only).
-- Safe to re-run.

alter table public.profiles
  add column if not exists beta_user boolean not null default false;

comment on column public.profiles.beta_user is
  'Beta tester: full premium access regardless of contribution/monthly rules';

-- Do not downgrade beta users during membership recalculation
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

-- Monthly cron: beta users keep access
create or replace function public.run_monthly_membership_reset()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now())::date;
  affected integer;
begin
  update public.profiles
  set
    monthly_reports_count = 0,
    monthly_votes_count = 0,
    monthly_points = 0,
    last_monthly_reset = month_start,
    updated_at = now()
  where last_monthly_reset < month_start
     or last_monthly_reset is null;

  get diagnostics affected = row_count;

  update public.profiles p
  set membership_type = 'inactive', updated_at = now()
  where not p.is_admin
    and not coalesce(p.beta_user, false)
    and p.verification_status = 'verified'
    and not (
      p.membership_type = 'annual_member'
      and p.membership_expires_at is not null
      and p.membership_expires_at > now()
    );

  return affected;
end;
$$;

-- RLS access helper
create or replace function public.has_cabrador_access(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = user_id
      and (
        p.is_admin
        or coalesce(p.beta_user, false)
        or (
          p.verification_status = 'verified'
          and (
            p.membership_type = 'active_driver'
            or (
              p.membership_type = 'annual_member'
              and p.membership_expires_at is not null
              and p.membership_expires_at > now()
            )
          )
        )
      )
  );
$$;
