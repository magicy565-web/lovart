-- Project-scoped canvas documents while preserving anonymous workspaces.
CREATE TABLE IF NOT EXISTS canvas_documents (
  workspace_id uuid PRIMARY KEY,
  title varchar(160) NOT NULL DEFAULT '未命名发布企划',
  document jsonb NOT NULL DEFAULT '{"items":[],"logs":[]}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE canvas_documents
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS canvas_documents_project_id_uidx
  ON canvas_documents (project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS canvas_documents_updated_at_idx
  ON canvas_documents (updated_at DESC);
