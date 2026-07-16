import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { artifacts, artifactRevisions, projectCollaborators, projectForks, projects } from "@/lib/db/schema"
import type { ForkProjectInput, ForkProjectResponse } from "@/features/explore/contracts"
import { EXPLORE_PIPELINE_STAGES } from "@/lib/explore/pipeline"
import { recordActivity } from "@/features/explore/server/shared"

function projectSlug() {
  return `fork-${Math.random().toString(36).slice(2, 10)}`
}

export async function forkProject(input: ForkProjectInput, actorId: string): Promise<ForkProjectResponse> {
  const [source] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1)
  if (!source) throw new Error("来源项目不存在")
  if (source.visibility !== "public") throw new Error("只能 Fork 已公开的企划")
  if (!source.allowFork) throw new Error("该企划未开放 Fork")

  const rootId = source.rootProjectId ?? source.id
  const forkDepth = (source.forkDepth ?? 0) + 1

  const [target] = await db
    .insert(projects)
    .values({
      name: input.title,
      slug: projectSlug(),
      status: "planning",
      initialPrompt: source.initialPrompt,
      styleDirection: source.styleDirection,
      ownerId: actorId,
      visibility: "private",
      category: source.category,
      coverImage: source.coverImage,
      summary: source.summary,
      activeSummary: `Fork 自「${source.name}」· ${input.mode === "continue" ? "继续完成" : input.mode === "reposition" ? "改变定位" : "探索新路线"}`,
      nextMilestone: source.nextMilestone,
      currentStage: source.currentStage,
      collaborationMode: "request",
      allowFork: true,
      forkedFromProjectId: source.id,
      forkedFromNodeId: input.sourceNodeId ?? null,
      rootProjectId: rootId,
      forkDepth,
      lastActivityAt: new Date(),
    })
    .returning()

  for (const stage of EXPLORE_PIPELINE_STAGES) {
    await db.insert(artifacts).values({
      projectId: target.id,
      type: stage.type,
      title: stage.title,
      sortOrder: stage.sequence - 1,
      status: stage.sequence === 1 ? "ready" : "locked",
    })
  }

  const inheritIds = input.inheritArtifactIds
  const sourceArtifacts = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.projectId, source.id), eq(artifacts.status, "approved")))

  const toCopy =
    inheritIds.length > 0
      ? sourceArtifacts.filter((item) => inheritIds.includes(item.id))
      : input.scope === "full_project"
        ? sourceArtifacts
        : []

  const inheritedIds: string[] = []
  for (const sourceArtifact of toCopy) {
    if (!sourceArtifact.currentRevisionId) continue
    const [revision] = await db
      .select()
      .from(artifactRevisions)
      .where(eq(artifactRevisions.id, sourceArtifact.currentRevisionId))
      .limit(1)
    if (!revision) continue

    const [targetArtifact] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.projectId, target.id), eq(artifacts.type, sourceArtifact.type)))
      .limit(1)
    if (!targetArtifact) continue

    const [newRevision] = await db
      .insert(artifactRevisions)
      .values({
        artifactId: targetArtifact.id,
        version: 1,
        content: revision.content,
        prompt: `Fork 自 ${source.name}`,
      })
      .returning()

    await db
      .update(artifacts)
      .set({ status: "approved", currentRevisionId: newRevision.id })
      .where(eq(artifacts.id, targetArtifact.id))

    const next = EXPLORE_PIPELINE_STAGES.find((s) => s.sequence === sourceArtifact.sortOrder + 2)
    if (next) {
      await db
        .update(artifacts)
        .set({ status: "ready" })
        .where(and(eq(artifacts.projectId, target.id), eq(artifacts.type, next.type), eq(artifacts.status, "locked")))
    }

    inheritedIds.push(sourceArtifact.id)
  }

  await db.insert(projectForks).values({
    sourceProjectId: source.id,
    sourceNodeId: input.sourceNodeId ?? null,
    sourceArtifactId: input.sourceArtifactId ?? null,
    targetProjectId: target.id,
    creatorId: actorId,
    scope: input.scope,
    mode: input.mode,
    inheritedArtifactIds: inheritedIds,
  })

  await db
    .update(projects)
    .set({ forkCount: sql`${projects.forkCount} + 1`, lastActivityAt: new Date() })
    .where(eq(projects.id, source.id))

  await db.insert(projectCollaborators).values({
    projectId: target.id,
    userId: actorId,
    role: "owner",
  })

  await recordActivity(source.id, "project_forked", actorId, target.id, {
    targetProjectId: target.id,
    title: target.name,
    mode: input.mode,
    scope: input.scope,
  })
  await recordActivity(target.id, "project_created_from_fork", actorId, source.id, {
    sourceProjectId: source.id,
    sourceTitle: source.name,
  })

  return {
    projectId: target.id,
    studioUrl: `/studio?project=${target.id}`,
    title: target.name,
  }
}
