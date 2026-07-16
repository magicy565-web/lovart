"use server"

import { revalidatePath } from "next/cache"

import {
  claimNeedSchema,
  collaborationRequestSchema,
  commentSchema,
  createNeedSchema,
  exploreProjectIdSchema,
  exploreQuerySchema,
  forkProjectSchema,
  resolveCollaborationSchema,
  shareProjectSchema,
  type ExploreQuery,
} from "@/features/explore/contracts"
import * as explore from "@/features/explore/server/service"
import { getOptionalUser, requireUser } from "@/lib/auth-session"

export async function getExploreProjects(input: Partial<ExploreQuery> = {}) {
  const viewer = await getOptionalUser()
  return explore.getExploreProjects(exploreQuerySchema.parse(input), viewer?.id)
}

export async function getExploreInitial() {
  const viewer = await getOptionalUser()
  return explore.getExploreInitial(viewer?.id)
}

export async function getExploreProjectDetail(projectId: string) {
  const viewer = await getOptionalUser()
  return explore.getExploreProjectDetail(exploreProjectIdSchema.parse(projectId), viewer?.id)
}

export async function getGlobalActivityFeed(limit = 40) {
  return explore.getGlobalActivityFeed(limit)
}

export async function shareToExplore(input: {
  projectId: string
  category: string
  coverImage?: string | null
  summary?: string
  allowFork?: boolean
  collaborationMode?: "closed" | "request" | "open_contributor" | "open_editor"
}) {
  const user = await requireUser()
  const parsed = shareProjectSchema.parse(input)
  const result = await explore.shareToExplore(parsed, user.id)
  revalidatePath("/explore")
  revalidatePath(`/explore/${parsed.projectId}`)
  revalidatePath(`/studio`)
  return result
}

export async function unshareFromExplore(projectId: string) {
  const user = await requireUser()
  const result = await explore.unshareFromExplore(exploreProjectIdSchema.parse(projectId), user.id)
  revalidatePath("/explore")
  revalidatePath(`/explore/${projectId}`)
  return result
}

export async function likeProject(projectId: string) {
  const user = await requireUser()
  return explore.likeProject(exploreProjectIdSchema.parse(projectId), user.id)
}

export async function unlikeProject(projectId: string) {
  const user = await requireUser()
  return explore.unlikeProject(exploreProjectIdSchema.parse(projectId), user.id)
}

export async function saveProject(projectId: string) {
  const user = await requireUser()
  return explore.saveProject(exploreProjectIdSchema.parse(projectId), user.id)
}

export async function unsaveProject(projectId: string) {
  const user = await requireUser()
  return explore.unsaveProject(exploreProjectIdSchema.parse(projectId), user.id)
}

export async function forkProject(input: {
  projectId: string
  title: string
  scope?: "full_project" | "direction" | "artifact"
  mode?: "continue" | "reposition" | "explore"
  sourceNodeId?: string
  sourceArtifactId?: string
  inheritArtifactIds?: string[]
}) {
  const user = await requireUser()
  const parsed = forkProjectSchema.parse(input)
  const result = await explore.forkProject(parsed, user.id)
  revalidatePath("/explore")
  revalidatePath(`/explore/${parsed.projectId}`)
  return result
}

export async function requestCollaboration(input: {
  projectId: string
  requestedRole?: "contributor" | "editor" | "viewer"
  needId?: string
  message?: string
}) {
  const user = await requireUser()
  const parsed = collaborationRequestSchema.parse(input)
  const result = await explore.requestCollaboration(
    parsed.projectId,
    user.id,
    parsed.requestedRole,
    parsed.needId,
    parsed.message,
  )
  revalidatePath(`/explore/${parsed.projectId}`)
  return result
}

export async function resolveCollaborationRequest(requestId: string, decision: "approved" | "rejected") {
  const user = await requireUser()
  const parsed = resolveCollaborationSchema.parse({ requestId, decision })
  const result = await explore.resolveCollaborationRequest(parsed.requestId, parsed.decision, user.id)
  revalidatePath("/explore")
  return result
}

export async function createProjectNeed(input: {
  projectId: string
  type?: "design" | "research" | "testing" | "supplier" | "content" | "distribution"
  title: string
  description?: string
  requiredCount?: number
}) {
  const user = await requireUser()
  const parsed = createNeedSchema.parse(input)
  const result = await explore.createProjectNeed(parsed.projectId, user.id, parsed)
  revalidatePath(`/explore/${parsed.projectId}`)
  return result
}

export async function claimProjectNeed(projectId: string, needId: string) {
  const user = await requireUser()
  const parsed = claimNeedSchema.parse({ projectId, needId })
  const result = await explore.claimProjectNeed(parsed.projectId, parsed.needId, user.id)
  revalidatePath(`/explore/${parsed.projectId}`)
  return result
}

export async function addProjectComment(projectId: string, body: string) {
  const user = await requireUser()
  const parsed = commentSchema.parse({ projectId, body })
  const result = await explore.addProjectComment(parsed.projectId, user.id, parsed.body)
  revalidatePath(`/explore/${parsed.projectId}`)
  return result
}

export async function claimProjectOwnership(projectId: string) {
  const user = await requireUser()
  return explore.claimProjectOwnership(exploreProjectIdSchema.parse(projectId), user.id)
}
