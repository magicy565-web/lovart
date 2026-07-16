-- Campaign evidence, publication snapshots, reservations, and rate limits.
DO $$
BEGIN
  IF to_regclass('public.campaign_reservations') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'campaign_reservations' AND column_name = 'snapshot_id'
    ) THEN
    IF to_regclass('public.legacy_campaign_reservations') IS NULL THEN
      ALTER TABLE public.campaign_reservations RENAME TO legacy_campaign_reservations;
      ALTER TABLE public.legacy_campaign_reservations
        RENAME CONSTRAINT campaign_reservations_pkey TO legacy_campaign_reservations_pkey;
    ELSE
      RAISE EXCEPTION 'public.campaign_reservations conflicts with Lovart and public.legacy_campaign_reservations already exists';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS campaign_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  requirement_id text NOT NULL,
  label text NOT NULL,
  role text NOT NULL DEFAULT 'proof',
  media_type text NOT NULL,
  url text NOT NULL,
  truth_class text NOT NULL,
  provenance text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS campaign_evidence_project_idx ON campaign_evidence (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'assumption',
  scope text NOT NULL DEFAULT 'campaign',
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_claims_project_idx ON campaign_claims (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS publication_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  slug text NOT NULL,
  version integer NOT NULL,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  package jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS publication_snapshots_project_version_uidx ON publication_snapshots (project_id, version);
CREATE INDEX IF NOT EXISTS publication_snapshots_slug_status_idx ON publication_snapshots (slug, status, version DESC);

CREATE TABLE IF NOT EXISTS campaign_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  email text NOT NULL,
  tier_id text NOT NULL DEFAULT '',
  tier_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_reservations_snapshot_email_uidx ON campaign_reservations (snapshot_id, email);
CREATE INDEX IF NOT EXISTS campaign_reservations_tier_idx ON campaign_reservations (snapshot_id, tier_id, status);

CREATE TABLE IF NOT EXISTS campaign_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_rate_limits_key_window_uidx ON campaign_rate_limits (key_hash, action, window_start);
