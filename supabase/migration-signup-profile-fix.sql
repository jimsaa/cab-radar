-- CabRadar — Signup profile columns (run if signup fails with driver_license_hash missing)
-- Safe to re-run. Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists cabradar_user_id text,
  add column if not exists driver_license_hash text,
  add column if not exists driver_license_last4 text,
  add column if not exists phone_number text,
  add column if not exists driver_license_number text;

create or replace function public.generate_cabradar_user_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Could not generate unique CabRadar User ID';
    end if;
    candidate := 'CR-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    exit when not exists (
      select 1 from public.profiles where cabradar_user_id = candidate
    );
  end loop;
  return candidate;
end;
$$;

create unique index if not exists profiles_cabradar_user_id_key
  on public.profiles (cabradar_user_id)
  where cabradar_user_id is not null;

create unique index if not exists profiles_driver_license_hash_key
  on public.profiles (driver_license_hash)
  where driver_license_hash is not null;

-- Ensure new auth users get a profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    phone_number,
    cabradar_user_id,
    verification_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    public.generate_cabradar_user_id(),
    'pending_verification'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
