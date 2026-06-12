-- Taxi i nöd help article — privacy and admin contact policy.
-- Requires help_articles (migration-driver-help.sql). Safe to re-run.

do $$
begin
  if to_regclass('public.help_articles') is null then
    raise notice 'Skipping Taxi i nöd help article: run migration-driver-help.sql first.';
    return;
  end if;

  update public.help_articles
  set
    category = 'quick_guides'::public.help_category,
    short_summary = 'Så fungerar Taxi i nöd — plats, säkerhet och integritet.',
    body_content = 'Taxi i nöd är CabRadars akutfunktion när en förare behöver hjälp.

Förare i närheten ser endast ungefärlig plats och säkerhetsråd — aldrig telefonnummer, e-post eller andra personuppgifter om den som larmat.

Telefonnummer delas endast med administratörer och behöriga Co-admins vid Taxi i nöd-larm för att möjliggöra snabb kontakt och bedömning av situationen.

Som förare i närheten:
• Närma dig lugnt och på säkert avstånd.
• Utsätt aldrig dig själv för fara.
• Om du ser tecken på våld, hot eller annan allvarlig situation – ring 112 omedelbart.

Administratörer och behöriga Co-admins kan se vem som aktiverat larmet, var personen befinner sig, och vid behörighet ringa föraren direkt.',
    step_by_step_instructions = array[
      'Aktivera Taxi i nöd endast vid verkligt behov av hjälp.',
      'Håll appen öppen så GPS kan uppdateras.',
      'Vänta på kontakt från admin eller kollegor i närheten.',
      'Avsluta larmet med ”Jag är OK” när situationen är löst.'
    ],
    tags = array['nödläge', 'säkerhet', 'integritet', '112'],
    updated_at = now()
  where title = 'Taxi i nöd';

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
    'Taxi i nöd',
    'quick_guides'::public.help_category,
    'Så fungerar Taxi i nöd — plats, säkerhet och integritet.',
    'Taxi i nöd är CabRadars akutfunktion när en förare behöver hjälp.

Förare i närheten ser endast ungefärlig plats och säkerhetsråd — aldrig telefonnummer, e-post eller andra personuppgifter om den som larmat.

Telefonnummer delas endast med administratörer och behöriga Co-admins vid Taxi i nöd-larm för att möjliggöra snabb kontakt och bedömning av situationen.

Som förare i närheten:
• Närma dig lugnt och på säkert avstånd.
• Utsätt aldrig dig själv för fara.
• Om du ser tecken på våld, hot eller annan allvarlig situation – ring 112 omedelbart.

Administratörer och behöriga Co-admins kan se vem som aktiverat larmet, var personen befinner sig, och vid behörighet ringa föraren direkt.',
    array[
      'Aktivera Taxi i nöd endast vid verkligt behov av hjälp.',
      'Håll appen öppen så GPS kan uppdateras.',
      'Vänta på kontakt från admin eller kollegor i närheten.',
      'Avsluta larmet med ”Jag är OK” när situationen är löst.'
    ],
    array['nödläge', 'säkerhet', 'integritet', '112'],
    true,
    true,
    0
  where not exists (
    select 1 from public.help_articles where title = 'Taxi i nöd'
  );
end $$;
