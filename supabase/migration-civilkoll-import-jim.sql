-- Bulk import Jim's Civilkoll list into civil_registry (approved, admin_manual).
-- Requires migration-civilkoll-v2.sql first.
--
-- Option A: Paste registration numbers into jim_lines below (one per array element).
-- Option B: Use Admin UI → Civilkoll-databas → Importera lista
-- Option C: npm run import:civilkoll (after pasting into supabase/data/jim-civilkoll-import.txt)
--
-- Safe to re-run — duplicates are skipped.

do $$
declare
  v_admin_id uuid := 'ca340a4a-26d0-46b6-9286-21f5a535d370';
  v_line text;
  v_normalized text;
  v_now timestamptz := now();
  v_imported int := 0;
  v_skipped int := 0;
  jim_lines text[] := array[
    -- Paste lines here, e.g. 'ABC123', 'DEF 456', 'GHI-789'
  ];
begin
  if to_regclass('public.civil_registry') is null then
    raise exception 'Run migration-civilkoll-v2.sql first.';
  end if;

  if coalesce(array_length(jim_lines, 1), 0) = 0 then
    raise notice 'No lines in jim_lines — paste registration numbers into the array first.';
    return;
  end if;

  foreach v_line in array jim_lines loop
    v_normalized := upper(regexp_replace(trim(v_line), '[\s-]', '', 'g'));

    if char_length(v_normalized) < 2 or char_length(v_normalized) > 10 then
      continue;
    end if;

    if exists (
      select 1 from public.civil_registry
      where registration_number = v_normalized
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.civil_registry (
      registration_number,
      admin_note,
      observation_count,
      last_observed_at,
      approved_by,
      approved_at,
      source,
      status
    ) values (
      v_normalized,
      trim(v_line),
      1,
      current_date,
      v_admin_id,
      v_now,
      'admin_manual',
      'approved'
    );

    v_imported := v_imported + 1;
  end loop;

  raise notice 'Civilkoll import: % imported, % skipped (duplicates)', v_imported, v_skipped;
end $$;
