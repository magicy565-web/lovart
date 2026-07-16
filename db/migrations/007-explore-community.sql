-- Explore community: ownership, fork lineage, collaboration, activity.

-- Project ownership and lineage (nullable owner for legacy rows)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES lovart_users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_summary text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_milestone text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaboration_mode text NOT NULL DEFAULT 'request';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS allow_fork boolean NOT NULL DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forked_from_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forked_from_node_id text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS root_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fork_depth integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fork_count integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS save_count integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_to_explore_at timestamptz;

CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner_id);
CREATE INDEX IF NOT EXISTS projects_public_activity_idx ON projects (visibility, last_activity_at DESC) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS projects_forked_from_idx ON projects (forked_from_project_id);
CREATE INDEX IF NOT EXISTS projects_root_idx ON projects (root_project_id);

-- Per-user likes / saves
CREATE TABLE IF NOT EXISTS project_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_likes_user_idx ON project_likes (user_id);

CREATE TABLE IF NOT EXISTS project_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_saves_user_idx ON project_saves (user_id);

-- Collaborators and join requests
CREATE TABLE IF NOT EXISTS project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor', -- owner | editor | contributor | viewer
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_collaborators_user_idx ON project_collaborators (user_id);

CREATE TABLE IF NOT EXISTS collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  requested_role text NOT NULL DEFAULT 'contributor',
  need_id uuid,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS collaboration_requests_project_idx ON collaboration_requests (project_id, status);

-- Open needs and claims
CREATE TABLE IF NOT EXISTS project_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'design', -- design | research | testing | supplier | content | distribution
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_count integer NOT NULL DEFAULT 1,
  claimed_count integer NOT NULL DEFAULT 0,
  required_role text NOT NULL DEFAULT 'contributor',
  status text NOT NULL DEFAULT 'open', -- open | in_progress | completed
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_needs_project_idx ON project_needs (project_id, status);

CREATE TABLE IF NOT EXISTS project_need_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES project_needs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active', -- active | completed | withdrawn
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id, user_id)
);

-- Activity feed
CREATE TABLE IF NOT EXISTS project_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES lovart_users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_activities_project_idx ON project_activities (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_activities_created_idx ON project_activities (created_at DESC);

-- Fork records
CREATE TABLE IF NOT EXISTS project_forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_node_id text,
  source_artifact_id uuid,
  target_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES lovart_users(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'full_project', -- full_project | direction | artifact
  mode text NOT NULL DEFAULT 'continue', -- continue | reposition | explore
  inherited_artifact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_forks_source_idx ON project_forks (source_project_id);
CREATE INDEX IF NOT EXISTS project_forks_target_idx ON project_forks (target_project_id);

-- Comments
CREATE TABLE IF NOT EXISTS project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_comments_project_idx ON project_comments (project_id, created_at DESC);

-- Simplified public canvas nodes for Live View
CREATE TABLE IF NOT EXISTS project_public_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'pipeline_stage', -- project_origin | pipeline_stage | artifact | direction | fork | milestone | blocker | publication
  title text NOT NULL,
  summary text,
  image text,
  stage text,
  status text NOT NULL DEFAULT 'active', -- inherited | active | completed | blocked | deprecated
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  source_node_id text,
  artifact_id uuid,
  forkable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_public_nodes_project_idx ON project_public_nodes (project_id, sort_order);
