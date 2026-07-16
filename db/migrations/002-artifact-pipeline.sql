DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'project_id'
    ) THEN
    IF to_regclass('public.legacy_tasks') IS NULL THEN
      ALTER TABLE public.tasks RENAME TO legacy_tasks;
      ALTER TABLE public.legacy_tasks RENAME CONSTRAINT tasks_pkey TO legacy_tasks_pkey;
    ELSE
      RAISE EXCEPTION 'public.tasks conflicts with Lovart and public.legacy_tasks already exists';
    END IF;
  END IF;

  IF to_regclass('public.validation_signals') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'validation_signals' AND column_name = 'type'
    ) THEN
    IF to_regclass('public.legacy_validation_signals') IS NULL THEN
      ALTER TABLE public.validation_signals RENAME TO legacy_validation_signals;
      ALTER TABLE public.legacy_validation_signals RENAME CONSTRAINT validation_signals_pkey TO legacy_validation_signals_pkey;
    ELSE
      RAISE EXCEPTION 'public.validation_signals conflicts with Lovart and public.legacy_validation_signals already exists';
    END IF;
  END IF;

  IF to_regclass('lovart.tasks') IS NOT NULL AND to_regclass('public.tasks') IS NULL THEN
    ALTER TABLE lovart.tasks SET SCHEMA public;
  END IF;
  IF to_regclass('lovart.validation_signals') IS NOT NULL AND to_regclass('public.validation_signals') IS NULL THEN
    ALTER TABLE lovart.validation_signals SET SCHEMA public;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'idle',
  initial_prompt text NOT NULL DEFAULT '',
  style_direction text NOT NULL DEFAULT '',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  agent_note text NOT NULL DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  current_revision_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifact_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  type text NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lovart_tasks_project_type_uidx ON tasks(project_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_artifacts_project_type_uidx ON artifacts(project_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_artifact_revisions_version_uidx ON artifact_revisions(artifact_id, version);
CREATE INDEX IF NOT EXISTS lovart_validation_signals_project_id_idx ON validation_signals(project_id);
