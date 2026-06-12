-- Push notification preferences on profiles
alter table public.profiles
  add column if not exists push_enabled boolean not null default true,
  add column if not exists push_prompted boolean not null default false;

comment on column public.profiles.push_enabled is 'User wants push notifications (default on)';
comment on column public.profiles.push_prompted is 'OS notification permission has been requested once';
