DO $$
DECLARE
  table_name text;
  legacy_tables constant text[] := ARRAY[
    'canvas_documents',
    'projects',
    'tasks',
    'artifacts',
    'artifact_revisions',
    'validation_signals',
    'campaign_evidence',
    'campaign_claims',
    'publication_snapshots',
    'campaign_reservations',
    'campaign_rate_limits'
  ];
BEGIN
  IF to_regnamespace('lovart') IS NULL THEN
    RETURN;
  END IF;

  FOREACH table_name IN ARRAY legacy_tables LOOP
    IF to_regclass(format('lovart.%I', table_name)) IS NOT NULL
      AND to_regclass(format('public.%I', table_name)) IS NULL THEN
      EXECUTE format('ALTER TABLE lovart.%I SET SCHEMA public', table_name);
    ELSIF to_regclass(format('lovart.%I', table_name)) IS NOT NULL
      AND to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      RAISE WARNING 'Both lovart.% and public.% exist; leaving the legacy table untouched for manual reconciliation', table_name, table_name;
    END IF;
  END LOOP;
END $$;
