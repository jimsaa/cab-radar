-- Civilkoll help article v3 — KÄND CIVIL / EJ KÄND lookup only.
-- Requires help_articles (migration-driver-help.sql). Safe to re-run.

do $$
begin
  if to_regclass('public.help_articles') is null then
    raise notice 'Skipping Civilkoll help article: run migration-driver-help.sql first.';
    return;
  end if;

  update public.help_articles
  set
    short_summary = 'Snabb kontroll mot CabRadars interna observationsdatabas.',
    body_content = 'Civilkoll är CabRadars interna observationsdatabas. Den underhålls av CabRadar-administratörer och byggs upp genom granskade rapporter från förare.

Skriv registreringsnummer och tryck Kolla. Du får ett av två svar:

🟢 KÄND CIVIL — numret finns i den godkända databasen.
EJ KÄND (grå) — inget godkänt nummer hittades.

CabRadar visar inga fordonsuppgifter, anteckningar eller intern information. Funktionen är en snabb kontroll — CabRadar instruerar aldrig förare att ingripa fysiskt.',
    step_by_step_instructions = array[
      'Öppna Civilkoll i menyn.',
      'Skriv registreringsnummer.',
      'Tryck Kolla.',
      'Läs resultatet: KÄND CIVIL eller EJ KÄND.'
    ],
    updated_at = now()
  where title = 'Vad är Civilkoll?';

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
    'Vad är Civilkoll?',
    'quick_guides'::public.help_category,
    'Snabb kontroll mot CabRadars interna observationsdatabas.',
    'Civilkoll är CabRadars interna observationsdatabas. Den underhålls av CabRadar-administratörer och byggs upp genom granskade rapporter från förare.

Skriv registreringsnummer och tryck Kolla. Du får ett av två svar:

🟢 KÄND CIVIL — numret finns i den godkända databasen.
EJ KÄND (grå) — inget godkänt nummer hittades.

CabRadar visar inga fordonsuppgifter, anteckningar eller intern information. Funktionen är en snabb kontroll — CabRadar instruerar aldrig förare att ingripa fysiskt.',
    array[
      'Öppna Civilkoll i menyn.',
      'Skriv registreringsnummer.',
      'Tryck Kolla.',
      'Läs resultatet: KÄND CIVIL eller EJ KÄND.'
    ],
    array['Civilkoll', 'registreringsnummer', 'observationer'],
    true,
    true,
    0
  where not exists (
    select 1 from public.help_articles where title = 'Vad är Civilkoll?'
  );
end $$;
