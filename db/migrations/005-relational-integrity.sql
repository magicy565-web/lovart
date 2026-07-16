CREATE INDEX IF NOT EXISTS lovart_tasks_project_idx ON tasks (project_id, sort_order);
CREATE INDEX IF NOT EXISTS lovart_artifacts_project_idx ON artifacts (project_id, sort_order);
CREATE INDEX IF NOT EXISTS lovart_artifact_revisions_artifact_idx ON artifact_revisions (artifact_id, version DESC);
CREATE INDEX IF NOT EXISTS lovart_validation_signals_project_type_idx ON validation_signals (project_id, type, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_tasks_project_fk') THEN
    ALTER TABLE tasks ADD CONSTRAINT lovart_tasks_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_artifacts_project_fk') THEN
    ALTER TABLE artifacts ADD CONSTRAINT lovart_artifacts_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_artifact_revisions_artifact_fk') THEN
    ALTER TABLE artifact_revisions ADD CONSTRAINT lovart_artifact_revisions_artifact_fk
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_artifacts_current_revision_fk') THEN
    ALTER TABLE artifacts ADD CONSTRAINT lovart_artifacts_current_revision_fk
      FOREIGN KEY (current_revision_id) REFERENCES artifact_revisions(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_validation_signals_project_fk') THEN
    ALTER TABLE validation_signals ADD CONSTRAINT lovart_validation_signals_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_campaign_evidence_project_fk') THEN
    ALTER TABLE campaign_evidence ADD CONSTRAINT lovart_campaign_evidence_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_campaign_claims_project_fk') THEN
    ALTER TABLE campaign_claims ADD CONSTRAINT lovart_campaign_claims_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_publication_snapshots_project_fk') THEN
    ALTER TABLE publication_snapshots ADD CONSTRAINT lovart_publication_snapshots_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_campaign_reservations_snapshot_fk') THEN
    ALTER TABLE campaign_reservations ADD CONSTRAINT lovart_campaign_reservations_snapshot_fk
      FOREIGN KEY (snapshot_id) REFERENCES publication_snapshots(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_campaign_reservations_project_fk') THEN
    ALTER TABLE campaign_reservations ADD CONSTRAINT lovart_campaign_reservations_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF to_regclass('public.canvas_documents') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_canvas_documents_project_fk') THEN
    ALTER TABLE canvas_documents ADD CONSTRAINT lovart_canvas_documents_project_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_tasks_progress_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT lovart_tasks_progress_check CHECK (progress BETWEEN 0 AND 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_projects_like_count_check') THEN
    ALTER TABLE projects ADD CONSTRAINT lovart_projects_like_count_check CHECK (like_count >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_projects_current_stage_check') THEN
    ALTER TABLE projects ADD CONSTRAINT lovart_projects_current_stage_check CHECK (current_stage BETWEEN 1 AND 7) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lovart_campaign_rate_limits_count_check') THEN
    ALTER TABLE campaign_rate_limits ADD CONSTRAINT lovart_campaign_rate_limits_count_check CHECK (count >= 1) NOT VALID;
  END IF;
END $$;
