-- Admin user editor fields — Tesla-friendly user management.
-- Safe to re-run.

alter table public.profiles
  add column if not exists founder_badge boolean not null default false,
  add column if not exists trial_active boolean not null default false,
  add column if not exists tesla_view_enabled boolean not null default true,
  add column if not exists co_admin_civil_moderation boolean not null default false,
  add column if not exists co_admin_user_moderation boolean not null default false;

comment on column public.profiles.founder_badge is 'Founder badge — lifetime recognition';
comment on column public.profiles.trial_active is 'Free trial period active';
comment on column public.profiles.tesla_view_enabled is 'Can access Tesla View driving mode';
comment on column public.profiles.co_admin_civil_moderation is 'Co-admin: CivilKoll moderation';
comment on column public.profiles.co_admin_user_moderation is 'Co-admin: user verification moderation';
