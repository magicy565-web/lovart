-- Explore community fields.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility    text NOT NULL DEFAULT 'private';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category      text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image   text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS like_count    integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_stage integer NOT NULL DEFAULT 1;

-- 可选:为公开项目列表查询加索引
CREATE INDEX IF NOT EXISTS projects_visibility_idx ON projects (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_category_idx  ON projects (category) WHERE visibility = 'public';
