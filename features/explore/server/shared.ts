import "server-only"

import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { artifacts, projectActivities, projectPublicNodes, projects } from "@/lib/db/schema"
import type { ExploreCreator, ExploreStatus } from "@/features/explore/contracts"
import { EXPLORE_PIPELINE_STAGES } from "@/lib/explore/pipeline"

export type ViewerId = string | null | undefined

export function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString()
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function asStatus(status: string): ExploreStatus {
  return status === "published" ? "published" : "wip"
}

export function mapCreator(row: { id: string | null; name: string | null; image: string | null } | null | undefined): ExploreCreator | null {
  if (!row?.id) return null
  return { id: row.id, name: row.name ?? "创作者", avatar: row.image ?? null }
}

export async function recordActivity(
  projectId: string,
  type: string,
  actorId?: string | null,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(projectActivities).values({
    projectId,
    actorId: actorId ?? null,
    type,
    entityId: entityId ?? null,
    metadata,
  })
  await db
    .update(projects)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId))
}

export async function ensurePublicNodes(projectId: string) {
  const existing = await db
    .select({ id: projectPublicNodes.id })
    .from(projectPublicNodes)
    .where(eq(projectPublicNodes.projectId, projectId))
    .limit(1)
  if (existing.length > 0) return

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return

  const artifactRows = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.projectId, projectId))
    .orderBy(asc(artifacts.sortOrder))

  const originId = crypto.randomUUID()
  const nodes: Array<typeof projectPublicNodes.$inferInsert> = [
    {
      id: originId,
      projectId,
      type: "project_origin",
      title: project.name,
      summary: project.summary ?? project.initialPrompt?.slice(0, 160) ?? null,
      image: project.coverImage,
      stage: "brief",
      status: "completed",
      positionX: 0,
      positionY: 0,
      sortOrder: 0,
      forkable: true,
    },
  ]

  let prevNodeId = originId
  for (const stage of EXPLORE_PIPELINE_STAGES) {
    const artifact = artifactRows.find((item) => item.type === stage.type)
    const nodeId = crypto.randomUUID()
    const isCompleted = artifact?.status === "approved"
    const isActive =
      !isCompleted &&
      (artifact?.status === "generating" ||
        artifact?.status === "review" ||
        artifact?.status === "ready" ||
        project.currentStage === stage.sequence)
    nodes.push({
      id: nodeId,
      projectId,
      type: "pipeline_stage",
      title: stage.title,
      summary: isCompleted ? "已完成" : isActive ? "正在进行" : "尚未开始",
      stage: stage.type,
      status: isCompleted ? "completed" : isActive ? "active" : "inherited",
      positionX: 0,
      positionY: stage.sequence * 140,
      sourceNodeId: prevNodeId,
      artifactId: artifact?.id ?? null,
      sortOrder: stage.sequence,
      forkable: true,
    })
    prevNodeId = nodeId
  }

  if (project.forkedFromProjectId) {
    nodes.push({
      projectId,
      type: "fork",
      title: "Fork 来源",
      summary: "从其他企划继承",
      status: "inherited",
      positionX: -220,
      positionY: 0,
      sourceNodeId: project.forkedFromProjectId,
      sortOrder: -1,
      forkable: false,
    })
  }

  if (nodes.length) await db.insert(projectPublicNodes).values(nodes)
}
