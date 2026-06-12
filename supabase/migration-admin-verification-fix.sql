-- Fix: profile update trigger crashed on missing licence columns and blocked service-role updates
create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  -- Service role (server API) has no auth.uid() — allow backend updates
  if auth.uid() is null then
    return new;
  end if;

  select is_admin into actor_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_is_admin, false) then
    return new;
  end if;

  -- Only protect columns that exist on all CabRadar deployments
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
