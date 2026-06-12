-- CabRadar — Feedback status values (Swedish)
-- Run on existing projects after migration-verification-v2.sql

alter table public.user_feedback drop constraint if exists user_feedback_status_check;

update public.user_feedback set status = 'ny' where status = 'open';
update public.user_feedback set status = 'behandlas' where status = 'reviewed';
update public.user_feedback set status = 'klar' where status = 'closed';

alter table public.user_feedback alter column status set default 'ny';

alter table public.user_feedback
  add constraint user_feedback_status_check
  check (status in ('ny', 'behandlas', 'klar'));
