import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { collaborationRequests, projectCollaborators, projectComments, projectNeedClaims, projectNeeds, projects } from "@/lib/db/schema"
import { recordActivity } from "@/features/explore/server/shared"

export async function requestCollaboration(
  projectId: string,
  applicantId: string,
  requestedRole: "contributor" | "editor" | "viewer" = "contributor",
  needId?: string,
  message = "",
) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || project.visibility !== "public") throw new Error("项目不可申请协作")
  if (project.collaborationMode === "closed") throw new Error("该企划暂不开放协作")

  if (project.collaborationMode === "open_contributor" || project.collaborationMode === "open_editor") {
    const role = project.collaborationMode === "open_editor" ? "editor" : "contributor"
    await db
      .insert(projectCollaborators)
      .values({ projectId, userId: applicantId, role })
      .onConflictDoNothing()
    await recordActivity(projectId, "collaborator_joined", applicantId, applicantId, { role })
    return { ok: true as const, status: "approved" as const }
  }

  const [existing] = await db
    .select()
    .from(collaborationRequests)
    .where(
      and(
        eq(collaborationRequests.projectId, projectId),
        eq(collaborationRequests.applicantId, applicantId),
        eq(collaborationRequests.status, "pending"),
      ),
    )
    .limit(1)
  if (existing) return { ok: true as const, status: "pending" as const, requestId: existing.id }

  const [request] = await db
    .insert(collaborationRequests)
    .values({
      projectId,
      applicantId,
      requestedRole,
      needId: needId ?? null,
      message,
      status: "pending",
    })
    .returning()

  await recordActivity(projectId, "collaboration_requested", applicantId, request.id, {
    requestedRole,
    message,
  })

  return { ok: true as const, status: "pending" as const, requestId: request.id }
}

export async function resolveCollaborationRequest(
  requestId: string,
  decision: "approved" | "rejected",
  actorId: string,
) {
  const [request] = await db
    .select()
    .from(collaborationRequests)
    .where(eq(collaborationRequests.id, requestId))
    .limit(1)
  if (!request) throw new Error("申请不存在")

  const [project] = await db.select().from(projects).where(eq(projects.id, request.projectId)).limit(1)
  if (!project) throw new Error("项目不存在")
  if (project.ownerId && project.ownerId !== actorId) throw new Error("只有负责人可以处理申请")

  await db
    .update(collaborationRequests)
    .set({ status: decision, resolvedAt: new Date() })
    .where(eq(collaborationRequests.id, requestId))

  if (decision === "approved") {
    await db
      .insert(projectCollaborators)
      .values({
        projectId: request.projectId,
        userId: request.applicantId,
        role: request.requestedRole,
      })
      .onConflictDoNothing()
    await recordActivity(request.projectId, "collaborator_joined", request.applicantId, request.applicantId, {
      role: request.requestedRole,
    })
  }

  return { ok: true as const, status: decision }
}

export async function createProjectNeed(
  projectId: string,
  actorId: string,
  input: { type: string; title: string; description?: string; requiredCount?: number },
) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) throw new Error("项目不存在")
  if (project.ownerId && project.ownerId !== actorId) throw new Error("只有负责人可以发布需求")

  const [need] = await db
    .insert(projectNeeds)
    .values({
      projectId,
      type: input.type,
      title: input.title,
      description: input.description ?? "",
      requiredCount: input.requiredCount ?? 1,
      status: "open",
    })
    .returning()

  await recordActivity(projectId, "need_created", actorId, need.id, { title: need.title, type: need.type })
  return need
}

export async function claimProjectNeed(projectId: string, needId: string, userId: string) {
  const [need] = await db
    .select()
    .from(projectNeeds)
    .where(and(eq(projectNeeds.id, needId), eq(projectNeeds.projectId, projectId)))
    .limit(1)
  if (!need) throw new Error("需求不存在")
  if (need.status === "completed") throw new Error("该需求已完成")
  if (need.claimedCount >= need.requiredCount) throw new Error("该需求名额已满")

  const inserted = await db
    .insert(projectNeedClaims)
    .values({ needId, userId, status: "active" })
    .onConflictDoNothing()
    .returning({ id: projectNeedClaims.id })

  if (inserted.length === 0) return { ok: true as const, claimed: true }

  const nextCount = need.claimedCount + 1
  await db
    .update(projectNeeds)
    .set({
      claimedCount: nextCount,
      status: nextCount >= need.requiredCount ? "in_progress" : "open",
    })
    .where(eq(projectNeeds.id, needId))

  await db
    .insert(projectCollaborators)
    .values({ projectId, userId, role: need.requiredRole || "contributor" })
    .onConflictDoNothing()

  await recordActivity(projectId, "need_claimed", userId, needId, { title: need.title })
  return { ok: true as const, claimed: true }
}

export async function addProjectComment(projectId: string, authorId: string, body: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || project.visibility !== "public") throw new Error("无法评论")

  const [comment] = await db
    .insert(projectComments)
    .values({ projectId, authorId, body })
    .returning()

  await recordActivity(projectId, "comment_created", authorId, comment.id, {
    preview: body.slice(0, 80),
  })

  return comment
}

export async function claimProjectOwnership(projectId: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return null
  if (project.ownerId) return project
  const [updated] = await db
    .update(projects)
    .set({ ownerId: userId, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), sql`${projects.ownerId} is null`))
    .returning()
  if (updated) {
    await db
      .insert(projectCollaborators)
      .values({ projectId, userId, role: "owner" })
      .onConflictDoNothing()
  }
  return updated ?? project
}
