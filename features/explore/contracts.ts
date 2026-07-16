import { z } from "zod"

export const exploreQuerySchema = z.object({
  view: z.enum(["feed", "activity", "lineage"]).default("feed"),
  category: z.string().trim().min(1).max(40).optional(),
  status: z.enum(["all", "wip", "published"]).default("all"),
  sort: z.enum(["recommended", "active", "latest", "hot", "forked", "recruiting"]).default("latest"),
  stage: z.string().trim().min(1).max(40).optional(),
  collaboration: z.enum(["all", "recruiting"]).default("all"),
  q: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(48).default(24),
  offset: z.number().int().min(0).max(10_000).default(0),
  cursor: z.string().trim().max(200).optional(),
})

export const shareProjectSchema = z.object({
  projectId: z.string().uuid(),
  category: z.string().trim().min(1).max(40),
  coverImage: z.string().trim().max(2_000).nullable().optional(),
  summary: z.string().trim().max(500).optional(),
  allowFork: z.boolean().default(true),
  collaborationMode: z.enum(["closed", "request", "open_contributor", "open_editor"]).default("request"),
})

export const exploreProjectIdSchema = z.string().uuid()

export const forkProjectSchema = z.object({
  projectId: z.string().uuid(),
  sourceNodeId: z.string().trim().max(120).optional(),
  sourceArtifactId: z.string().uuid().optional(),
  scope: z.enum(["full_project", "direction", "artifact"]).default("full_project"),
  mode: z.enum(["continue", "reposition", "explore"]).default("continue"),
  title: z.string().trim().min(1).max(160),
  inheritArtifactIds: z.array(z.string().uuid()).max(40).default([]),
})

export const collaborationRequestSchema = z.object({
  projectId: z.string().uuid(),
  requestedRole: z.enum(["contributor", "editor", "viewer"]).default("contributor"),
  needId: z.string().uuid().optional(),
  message: z.string().trim().max(500).default(""),
})

export const resolveCollaborationSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
})

export const claimNeedSchema = z.object({
  projectId: z.string().uuid(),
  needId: z.string().uuid(),
})

export const createNeedSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["design", "research", "testing", "supplier", "content", "distribution"]).default("design"),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).default(""),
  requiredCount: z.number().int().min(1).max(50).default(1),
})

export const commentSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(2_000),
})

export type ExploreQuery = z.infer<typeof exploreQuerySchema>
export type ShareProjectInput = z.infer<typeof shareProjectSchema>
export type ForkProjectInput = z.infer<typeof forkProjectSchema>
export type CollaborationMode = "closed" | "request" | "open_contributor" | "open_editor"
export type ExploreStatus = "wip" | "published"
export type ExploreView = "feed" | "activity" | "lineage"
export type ExploreSort = ExploreQuery["sort"]

export interface ExploreCreator {
  id: string
  name: string
  avatar: string | null
}

export interface ExploreOpenNeed {
  id: string
  type: string
  label: string
  remaining: number
}

export interface ExploreCard {
  projectId: string
  title: string
  slug: string
  summary: string | null
  coverImage: string | null
  coverWidth: number
  coverHeight: number
  category: string | null
  status: ExploreStatus
  activeSummary: string
  nextMilestone: string | null
  lastActivityAt: string
  pipeline: {
    currentStage: number
    totalStages: number
    completedStages: number
    stageLabel: string
  }
  creator: ExploreCreator | null
  collaborators: ExploreCreator[]
  openNeeds: ExploreOpenNeed[]
  collaborationMode: CollaborationMode
  lineage: {
    forkedFromProjectId: string | null
    forkedFromTitle: string | null
    rootProjectId: string | null
    forkDepth: number
    forkCount: number
  }
  metrics: {
    likeCount: number
    saveCount: number
    viewCount: number
    forkCount: number
  }
  permissions: {
    allowFork: boolean
  }
  viewerState: {
    isLiked: boolean
    isSaved: boolean
    relation: "owner" | "editor" | "contributor" | "viewer" | "applicant" | "none"
  }
  /** @deprecated use title */
  name?: string
  /** @deprecated use pipeline.currentStage */
  currentStage?: number
  /** @deprecated use metrics.likeCount */
  likeCount?: number
  createdAt?: string
}

export interface ExploreFeedResponse {
  items: ExploreCard[]
  nextOffset?: number
  hasMore: boolean
}

export interface PublicProjectNode {
  id: string
  projectId: string
  type: string
  title: string
  summary: string | null
  image: string | null
  stage: string | null
  status: string
  position: { x: number; y: number }
  sourceNodeId: string | null
  artifactId: string | null
  forkable: boolean
  sortOrder: number
}

export interface ProjectActivityItem {
  id: string
  projectId: string
  actor: ExploreCreator | null
  type: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  projectTitle?: string
}

export interface ProjectNeedItem {
  id: string
  projectId: string
  type: string
  title: string
  description: string
  requiredCount: number
  claimedCount: number
  remaining: number
  requiredRole: string
  status: string
  createdAt: string
  viewerClaimed: boolean
}

export interface ProjectCommentItem {
  id: string
  projectId: string
  author: ExploreCreator
  body: string
  createdAt: string
}

export interface ExploreProjectDetail {
  project: ExploreCard
  nodes: PublicProjectNode[]
  activities: ProjectActivityItem[]
  needs: ProjectNeedItem[]
  comments: ProjectCommentItem[]
  collaborators: Array<ExploreCreator & { role: string }>
  publication: {
    visibility: "private" | "public"
    allowFork: boolean
    collaborationMode: CollaborationMode
  }
  sourceProject: { id: string; title: string } | null
  childForks: Array<{ id: string; title: string; creator: ExploreCreator | null; createdAt: string }>
}

export interface ForkProjectResponse {
  projectId: string
  studioUrl: string
  title: string
}
