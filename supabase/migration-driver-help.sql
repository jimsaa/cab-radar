-- =============================================================================
-- CabRadar — Driver Help knowledge base
-- =============================================================================
-- Safe to re-run on existing CabRadar projects.
-- Run in Supabase SQL Editor after schema.sql (or migration-existing-project.sql)
-- =============================================================================

do $$ begin
  create type public.help_category as enum (
    'taximeter',
    'card_terminal',
    'documents_regulations',
    'vehicle_issues',
    'ev_charging',
    'customer_situations',
    'school_trips_medical_transport',
    'quick_guides'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------

create table if not exists public.help_articles (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  category                  public.help_category not null,
  short_summary             text not null default '',
  body_content              text not null default '',
  step_by_step_instructions text[] not null default '{}',
  image_urls                text[] not null default '{}',
  video_url                 text,
  tags                      text[] not null default '{}',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  published                 boolean not null default false,
  admin_verified            boolean not null default false,
  useful_votes              integer not null default 0,
  not_useful_votes          integer not null default 0,
  view_count                integer not null default 0,

  constraint help_articles_title_length check (char_length(title) between 3 and 200)
);

create index if not exists help_articles_category_idx on public.help_articles (category);
create index if not exists help_articles_published_idx on public.help_articles (published, admin_verified);
create index if not exists help_articles_view_count_idx on public.help_articles (view_count desc);
create index if not exists help_articles_tags_idx on public.help_articles using gin (tags);

comment on table public.help_articles is 'Driver Help knowledge base articles';

-- -----------------------------------------------------------------------------

create table if not exists public.help_article_votes (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.help_articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       smallint not null,
  created_at timestamptz not null default now(),

  unique (article_id, user_id)
);

do $$ begin
  alter table public.help_article_votes
    add constraint help_article_votes_value check (vote in (-1, 1));
exception when duplicate_object then null;
end $$;

-- Sync vote counts
create or replace function public.sync_help_article_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  target := coalesce(new.article_id, old.article_id);
  update public.help_articles
  set
    useful_votes = (select count(*) from public.help_article_votes where article_id = target and vote = 1),
    not_useful_votes = (select count(*) from public.help_article_votes where article_id = target and vote = -1),
    updated_at = now()
  where id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists cabradar_help_votes_after_change on public.help_article_votes;
create trigger cabradar_help_votes_after_change
  after insert or update or delete on public.help_article_votes
  for each row execute function public.sync_help_article_vote_counts();

-- Increment view count
create or replace function public.increment_help_article_views(article_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.help_articles
  set view_count = view_count + 1
  where id = article_id and published = true and admin_verified = true;
$$;

-- Auto-update updated_at on edit
create or replace function public.set_help_article_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cabradar_help_articles_updated_at on public.help_articles;
create trigger cabradar_help_articles_updated_at
  before update on public.help_articles
  for each row execute function public.set_help_article_updated_at();

-- ----------------------------------------------------------------------------- 
-- RLS
-- -----------------------------------------------------------------------------

alter table public.help_articles enable row level security;
alter table public.help_article_votes enable row level security;

drop policy if exists "CabRadar view published help" on public.help_articles;
create policy "CabRadar view published help"
  on public.help_articles for select using (
    (published = true and admin_verified = true)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar admins manage help" on public.help_articles;
create policy "CabRadar admins manage help"
  on public.help_articles for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "CabRadar view help votes" on public.help_article_votes;
create policy "CabRadar view help votes"
  on public.help_article_votes for select to authenticated using (true);

drop policy if exists "CabRadar insert help votes" on public.help_article_votes;
create policy "CabRadar insert help votes"
  on public.help_article_votes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "CabRadar update help votes" on public.help_article_votes;
create policy "CabRadar update help votes"
  on public.help_article_votes for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "CabRadar delete help votes" on public.help_article_votes;
create policy "CabRadar delete help votes"
  on public.help_article_votes for delete to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Seed example article (skip if title exists)
-- -----------------------------------------------------------------------------

insert into public.help_articles (
  title,
  category,
  short_summary,
  body_content,
  step_by_step_instructions,
  tags,
  published,
  admin_verified,
  view_count
)
select
  'How to print a police report on an M2 taximeter',
  'taximeter'::public.help_category,
  'Step-by-step guide to printing an inspection / police report from the M2 taximeter menu.',
  'Many inspections and compliance checks require a printed taximeter report. On the M2 unit, the police / inspection report is found under the service or report menu depending on firmware version. Always print after completing a shift or when requested by an inspector.',
  array[
    'Ensure the vehicle ignition is on and the M2 taximeter is powered.',
    'Press the menu button until you reach the main service menu.',
    'Navigate to Reports or Inspection (label varies by firmware).',
    'Select Police report or Inspection report.',
    'Confirm the date range if prompted (usually current shift or last 24 hours).',
    'Press Print and wait for the receipt to finish.',
    'Hand the printed report to the inspector or keep for your records.'
  ],
  array['M2', 'police report', 'taximeter', 'inspection'],
  true,
  true,
  12
where not exists (
  select 1 from public.help_articles
  where title = 'How to print a police report on an M2 taximeter'
);
