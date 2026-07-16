import "server-only"

import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { artifacts, projectCollaborators, projectLikes, projectPublicNodes, projects, projectSaves } from "@/lib/db/schema"
import type { ShareProjectInput } from "@/features/explore/contracts"
import { activeSummaryFromStage, nextMilestoneFromStage } from "@/lib/explore/pipeline"
import { asStatus, ensurePublicNodes, recordActivity } from "@/features/explore/server/shared"

export async function shareToExplore(input: ShareProjectInput, actorId?: string | null) {
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1)
  if (!project) throw new Error("项目不存在")
  if (actorId && project.ownerId && project.ownerId !== actorId) {
    throw new Error("只有项目负责人可以分享到灵感发现")
  }

  const approved = await db
    .select({ sortOrder: artifacts.sortOrder, type: artifacts.type, status: artifacts.status })
    .from(artifacts)
    .where(and(eq(artifacts.projectId, input.projectId), eq(artifacts.status, "approved")))
    .orderBy(desc(artifacts.sortOrder))

  const stage = approved.length > 0 ? approved[0].sortOrder + 1 : Math.max(1, project.currentStage)
  const status = asStatus(project.status)
  const activeSummary = activeSummaryFromStage(stage, status)
  const nextMilestone = nextMilestoneFromStage(stage, status)

  await db
    .update(projects)
    .set({
      visibility: "public",
      category: input.category,
      coverImage: input.coverImage ?? project.coverImage,
      summary: input.summary ?? project.summary ?? project.initialPrompt?.slice(0, 200) ?? null,
      activeSummary,
      nextMilestone,
      currentStage: stage,
      allowFork: input.allowFork,
      collaborationMode: input.collaborationMode,
      ownerId: project.ownerId ?? actorId ?? null,
      publishedToExploreAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, input.projectId))

  if (actorId && !project.ownerId) {
    await db
      .insert(projectCollaborators)
      .values({ projectId: input.projectId, userId: actorId, role: "owner" })
      .onConflictDoNothing()
  }

  // rebuild public nodes
  await db.delete(projectPublicNodes).where(eq(projectPublicNodes.projectId, input.projectId))
  await ensurePublicNodes(input.projectId)
  await recordActivity(input.projectId, "project_published", actorId, input.projectId, {
    category: input.category,
  })

  return { ok: true as const }
}

export async function unshareFromExplore(projectId: string, actorId?: string | null) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) throw new Error("项目不存在")
  if (actorId && project.ownerId && project.ownerId !== actorId) {
    throw new Error("只有项目负责人可以撤回分享")
  }
  await db
    .update(projects)
    .set({ visibility: "private", updatedAt: new Date() })
    .where(eq(projects.id, projectId))
  return { ok: true as const }
}

export async function likeProject(projectId: string, userId: string) {
  const inserted = await db
    .insert(projectLikes)
    .values({ projectId, userId })
    .onConflictDoNothing()
    .returning({ id: projectLikes.id })
  if (inserted.length > 0) {
    await db
      .update(projects)
      .set({ likeCount: sql`${projects.likeCount} + 1`, lastActivityAt: new Date() })
      .where(eq(projects.id, projectId))
  }
  return { ok: true as const, liked: true }
}

export async function unlikeProject(projectId: string, userId: string) {
  const deleted = await db
    .delete(projectLikes)
    .where(and(eq(projectLikes.projectId, projectId), eq(projectLikes.userId, userId)))
    .returning({ id: projectLikes.id })
  if (deleted.length > 0) {
    await db
      .update(projects)
      .set({ likeCount: sql`greatest(${projects.likeCount} - 1, 0)` })
      .where(eq(projects.id, projectId))
  }
  return { ok: true as const, liked: false }
}

export async function saveProject(projectId: string, userId: string) {
  const inserted = await db
    .insert(projectSaves)
    .values({ projectId, userId })
    .onConflictDoNothing()
    .returning({ id: projectSaves.id })
  if (inserted.length > 0) {
    await db
      .update(projects)
      .set({ saveCount: sql`${projects.saveCount} + 1` })
      .where(eq(projects.id, projectId))
  }
  return { ok: true as const, saved: true }
}

export async function unsaveProject(projectId: string, userId: string) {
  const deleted = await db
    .delete(projectSaves)
    .where(and(eq(projectSaves.projectId, projectId), eq(projectSaves.userId, userId)))
    .returning({ id: projectSaves.id })
  if (deleted.length > 0) {
    await db
      .update(projects)
      .set({ saveCount: sql`greatest(${projects.saveCount} - 1, 0)` })
      .where(eq(projects.id, projectId))
  }
  return { ok: true as const, saved: false }
}
