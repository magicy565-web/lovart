import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const directory = resolve(import.meta.dirname, "..", "db", "migrations")
const files = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort()

const requiredMigrations = [
  "000-reconcile-legacy-schema.sql",
  "001-project-scoped-canvas.sql",
  "002-artifact-pipeline.sql",
  "003-explore-fields.sql",
  "004-campaign-commercialization.sql",
  "005-relational-integrity.sql",
  "006-auth.sql",
  "007-explore-community.sql",
]

for (const file of requiredMigrations) assert.ok(files.includes(file), `missing required migration: ${file}`)
assert.deepEqual(
  files.map((file) => Number(file.slice(0, 3))),
  files.map((_, index) => index),
  "migration numbers must be unique and contiguous",
)

for (const file of files) {
  const sql = readFileSync(resolve(directory, file), "utf8")
  assert.ok(sql.trim().length > 0, `${file} must not be empty`)
  assert.equal(/SET\s+search_path\s+TO\s+lovart/i.test(sql), false, `${file} must target public schema`)
}

const integrity = readFileSync(resolve(directory, "005-relational-integrity.sql"), "utf8")
for (const table of ["tasks", "artifacts", "artifact_revisions", "validation_signals", "campaign_evidence", "publication_snapshots"]) {
  assert.match(integrity, new RegExp(`ALTER TABLE ${table}\\b`))
}

const auth = readFileSync(resolve(directory, "006-auth.sql"), "utf8")
for (const table of ["lovart_users", "lovart_auth_sessions", "lovart_auth_accounts", "lovart_auth_verifications", "lovart_auth_rate_limits"]) {
  assert.match(auth, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`))
}

const explore = readFileSync(resolve(directory, "007-explore-community.sql"), "utf8")
for (const table of [
  "project_likes",
  "project_saves",
  "project_collaborators",
  "collaboration_requests",
  "project_needs",
  "project_need_claims",
  "project_activities",
  "project_forks",
  "project_comments",
  "project_public_nodes",
]) {
  assert.match(explore, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`))
}
for (const column of ["owner_id", "allow_fork", "forked_from_project_id", "root_project_id", "fork_count"]) {
  assert.match(explore, new RegExp(column))
}

console.log("Migration contract checks passed.")
