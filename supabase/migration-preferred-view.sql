-- User cockpit preference: app | tesla | tab
-- Safe to re-run.

alter table public.profiles
  add column if not exists preferred_view text not null default 'app';

alter table public.profiles
  drop constraint if exists profiles_preferred_view_check;

alter table public.profiles
  add constraint profiles_preferred_view_check
  check (preferred_view in ('app', 'tesla', 'tab'));

comment on column public.profiles.preferred_view is 'User cockpit: app (mobile), tesla (driving), tab (tablet command center)';
