-- CabRadar – Hjälp & Information (overview article for help search).
-- Requires help_articles (migration-driver-help.sql). Safe to re-run.

do $$
begin
  if to_regclass('public.help_articles') is null then
    raise notice 'Skipping help guide article: run migration-driver-help.sql first.';
    return;
  end if;

  update public.help_articles
  set
    category = 'quick_guides'::public.help_category,
    short_summary = 'Komplett guide: Radar, Taxi i nöd, Civilkoll, medlemskap och mer.',
    body_content = 'Öppna guiden i appen under Hjälp → CabRadar – Hjälp & Information.

Innehåller:
• Radar — Laser, Taxikontroll, Stopp, Kö, Olycka
• Taxi i nöd — trygghet, telefonnummer, 112
• Civilkoll — KÄND CIVIL / EJ KÄND
• Erbjudanden, Support, Partner, Medlemskap och Beta',
    tags = array['guide', 'radar', 'nödläge', 'civilkoll', 'medlemskap'],
    published = true,
    admin_verified = true,
    updated_at = now()
  where title = 'CabRadar – Hjälp & Information';

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
    'CabRadar – Hjälp & Information',
    'quick_guides'::public.help_category,
    'Komplett guide: Radar, Taxi i nöd, Civilkoll, medlemskap och mer.',
    'Öppna guiden i appen under Hjälp → CabRadar – Hjälp & Information.

Innehåller:
• Radar — Laser, Taxikontroll, Stopp, Kö, Olycka
• Taxi i nöd — trygghet, telefonnummer, 112
• Civilkoll — KÄND CIVIL / EJ KÄND
• Erbjudanden, Support, Partner, Medlemskap och Beta',
    array[
      'Öppna Hjälp i menyn.',
      'Tryck på CabRadar – Hjälp & Information.',
      'Använd innehållsförteckningen för att hoppa till avsnitt.'
    ],
    array['guide', 'radar', 'nödläge', 'civilkoll', 'medlemskap'],
    true,
    true,
    0
  where not exists (
    select 1 from public.help_articles where title = 'CabRadar – Hjälp & Information'
  );
end $$;
