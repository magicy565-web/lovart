import { bigint, boolean, doublePrecision, pgTable, text, uuid, integer, timestamp, jsonb, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core"

export const user = pgTable(
  "lovart_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lovart_users_email_uidx").on(table.email)],
)

export const session = pgTable(
  "lovart_auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("lovart_auth_sessions_token_uidx").on(table.token),
    index("lovart_auth_sessions_user_idx").on(table.userId),
  ],
)

export const account = pgTable(
  "lovart_auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lovart_auth_accounts_provider_account_uidx").on(table.providerId, table.accountId),
    index("lovart_auth_accounts_user_idx").on(table.userId),
  ],
)

export const verification = pgTable(
  "lovart_auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lovart_auth_verifications_identifier_idx").on(table.identifier)],
)

export const rateLimit = pgTable(
  "lovart_auth_rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("lovart_auth_rate_limits_key_uidx").on(table.key)],
)

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("idle"),
  initialPrompt: text("initial_prompt").notNull().default(""),
  styleDirection: text("style_direction").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // Explore 社区字段
  ownerId: uuid("owner_id").references(() => user.id, { onDelete: "set null" }),
  visibility: text("visibility").notNull().default("private"), // "private" | "public"
  category: text("category"),
  coverImage: text("cover_image"),
  summary: text("summary"),
  activeSummary: text("active_summary"),
  nextMilestone: text("next_milestone"),
  likeCount: integer("like_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  forkCount: integer("fork_count").notNull().default(0),
  currentStage: integer("current_stage").notNull().default(1), // 1–6
  collaborationMode: text("collaboration_mode").notNull().default("request"),
  allowFork: boolean("allow_fork").notNull().default(true),
  forkedFromProjectId: uuid("forked_from_project_id"),
  forkedFromNodeId: text("forked_from_node_id"),
  rootProjectId: uuid("root_project_id"),
  forkDepth: integer("fork_depth").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  publishedToExploreAt: timestamp("published_to_explore_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projectLikes = pgTable(
  "project_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_likes_project_user_uidx").on(table.projectId, table.userId)],
)

export const projectSaves = pgTable(
  "project_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_saves_project_user_uidx").on(table.projectId, table.userId)],
)

export const projectCollaborators = pgTable(
  "project_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("contributor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_collaborators_project_user_uidx").on(table.projectId, table.userId)],
)

export const collaborationRequests = pgTable("collaboration_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  applicantId: uuid("applicant_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  requestedRole: text("requested_role").notNull().default("contributor"),
  needId: uuid("need_id"),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
})

export const projectNeeds = pgTable("project_needs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("design"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  requiredCount: integer("required_count").notNull().default(1),
  claimedCount: integer("claimed_count").notNull().default(0),
  requiredRole: text("required_role").notNull().default("contributor"),
  status: text("status").notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projectNeedClaims = pgTable(
  "project_need_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    needId: uuid("need_id").notNull().references(() => projectNeeds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_need_claims_need_user_uidx").on(table.needId, table.userId)],
)

export const projectActivities = pgTable("project_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => user.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projectForks = pgTable("project_forks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceProjectId: uuid("source_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sourceNodeId: text("source_node_id"),
  sourceArtifactId: uuid("source_artifact_id"),
  targetProjectId: uuid("target_project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  creatorId: uuid("creator_id").references(() => user.id, { onDelete: "set null" }),
  scope: text("scope").notNull().default("full_project"),
  mode: text("mode").notNull().default("continue"),
  inheritedArtifactIds: jsonb("inherited_artifact_ids").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projectComments = pgTable("project_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projectPublicNodes = pgTable("project_public_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("pipeline_stage"),
  title: text("title").notNull(),
  summary: text("summary"),
  image: text("image"),
  stage: text("stage"),
  status: text("status").notNull().default("active"),
  positionX: doublePrecision("position_x").notNull().default(0),
  positionY: doublePrecision("position_y").notNull().default(0),
  sourceNodeId: text("source_node_id"),
  artifactId: uuid("artifact_id"),
  forkable: boolean("forkable").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    agentNote: text("agent_note").notNull().default(""),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("lovart_tasks_project_type_uidx").on(table.projectId, table.type)],
)

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"),
    currentRevisionId: uuid("current_revision_id").references((): AnyPgColumn => artifactRevisions.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lovart_artifacts_project_type_uidx").on(table.projectId, table.type)],
)

export const artifactRevisions = pgTable(
  "artifact_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id").notNull().references(() => artifacts.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    content: jsonb("content").notNull().default({}),
    prompt: text("prompt").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lovart_artifact_revisions_version_uidx").on(table.artifactId, table.version)],
)

export const validationSignals = pgTable("validation_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  value: text("value").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const campaignEvidence = pgTable(
  "campaign_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    requirementId: text("requirement_id").notNull(),
    label: text("label").notNull(),
    role: text("role").notNull().default("proof"),
    mediaType: text("media_type").notNull(),
    url: text("url").notNull(),
    truthClass: text("truth_class").notNull(),
    provenance: text("provenance").notNull().default(""),
    status: text("status").notNull().default("pending"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [index("campaign_evidence_project_idx").on(table.projectId, table.createdAt)],
)

export const campaignClaims = pgTable(
  "campaign_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    status: text("status").notNull().default("assumption"),
    scope: text("scope").notNull().default("campaign"),
    evidenceIds: jsonb("evidence_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("campaign_claims_project_idx").on(table.projectId, table.createdAt)],
)

export const publicationSnapshots = pgTable(
  "publication_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    version: integer("version").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull().default("active"),
    package: jsonb("package").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("publication_snapshots_project_version_uidx").on(table.projectId, table.version),
    index("publication_snapshots_slug_status_idx").on(table.slug, table.status, table.version),
  ],
)

export const campaignReservations = pgTable(
  "campaign_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id").notNull().references(() => publicationSnapshots.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tierId: text("tier_id").notNull().default(""),
    tierName: text("tier_name").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaign_reservations_snapshot_email_uidx").on(table.snapshotId, table.email),
    index("campaign_reservations_tier_idx").on(table.snapshotId, table.tierId, table.status),
  ],
)

export const campaignRateLimits = pgTable(
  "campaign_rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull(),
    action: text("action").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [uniqueIndex("campaign_rate_limits_key_window_uidx").on(table.keyHash, table.action, table.windowStart)],
)

export type Project = typeof projects.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Artifact = typeof artifacts.$inferSelect
export type ArtifactRevision = typeof artifactRevisions.$inferSelect
export type ValidationSignal = typeof validationSignals.$inferSelect
export type CampaignEvidence = typeof campaignEvidence.$inferSelect
export type CampaignClaim = typeof campaignClaims.$inferSelect
export type PublicationSnapshot = typeof publicationSnapshots.$inferSelect
export type CampaignReservation = typeof campaignReservations.$inferSelect
export type AuthUser = typeof user.$inferSelect
export type AuthSession = typeof session.$inferSelect
export type ProjectLike = typeof projectLikes.$inferSelect
export type ProjectSave = typeof projectSaves.$inferSelect
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect
export type CollaborationRequest = typeof collaborationRequests.$inferSelect
export type ProjectNeed = typeof projectNeeds.$inferSelect
export type ProjectActivity = typeof projectActivities.$inferSelect
export type ProjectFork = typeof projectForks.$inferSelect
export type ProjectComment = typeof projectComments.$inferSelect
export type ProjectPublicNode = typeof projectPublicNodes.$inferSelect
