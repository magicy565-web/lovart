import "server-only"

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { collaborationRequests, projectActivities, projectCollaborators, projectComments, projectLikes, projectNeedClaims, projectNeeds, projectPublicNodes, projects, projectSaves, user } from "@/lib/db/schema"
import type { CollaborationMode, ExploreCard, ExploreCreator, ExploreFeedResponse, ExploreProjectDetail, ExploreQuery, ProjectActivityItem, ProjectCommentItem, ProjectNeedItem, PublicProjectNode } from "@/features/explore/contracts"
import { activeSummaryFromStage, EXPLORE_PIPELINE_STAGES, nextMilestoneFromStage } from "@/lib/explore/pipeline"
import { ViewerId, asStatus, ensurePublicNodes, mapCreator, toIso } from "@/features/explore/server/shared"

async function loadViewerMaps(projectIds: string[], viewerId: ViewerId) {
  const liked = new Set<string>()
  const saved = new Set<string>()
  const relations = new Map<string, ExploreCard["viewerState"]["relation"]>()

  if (!viewerId || projectIds.length === 0) {
    return { liked, saved, relations }
  }

  const [likes, saves, collabs, requests, owned] = await Promise.all([
    db
      .select({ projectId: projectLikes.projectId })
      .from(projectLikes)
      .where(and(eq(projectLikes.userId, viewerId), inArray(projectLikes.projectId, projectIds))),
    db
      .select({ projectId: projectSaves.projectId })
      .from(projectSaves)
      .where(and(eq(projectSaves.userId, viewerId), inArray(projectSaves.projectId, projectIds))),
    db
      .select({ projectId: projectCollaborators.projectId, role: projectCollaborators.role })
      .from(projectCollaborators)
      .where(and(eq(projectCollaborators.userId, viewerId), inArray(projectCollaborators.projectId, projectIds))),
    db
      .select({ projectId: collaborationRequests.projectId })
      .from(collaborationRequests)
      .where(
        and(
          eq(collaborationRequests.applicantId, viewerId),
          eq(collaborationRequests.status, "pending"),
          inArray(collaborationRequests.projectId, projectIds),
        ),
      ),
    db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.ownerId, viewerId), inArray(projects.id, projectIds))),
  ])

  for (const row of likes) liked.add(row.projectId)
  for (const row of saves) saved.add(row.projectId)
  for (const row of owned) relations.set(row.id, "owner")
  for (const row of collabs) {
    if (relations.has(row.projectId)) continue
    if (row.role === "editor") relations.set(row.projectId, "editor")
    else if (row.role === "contributor") relations.set(row.projectId, "contributor")
    else relations.set(row.projectId, "viewer")
  }
  for (const row of requests) {
    if (!relations.has(row.projectId)) relations.set(row.projectId, "applicant")
  }

  return { liked, saved, relations }
}

async function hydrateCards(
  rows: Array<{
    id: string
    name: string
    slug: string
    summary: string | null
    activeSummary: string | null
    nextMilestone: string | null
    coverImage: string | null
    category: string | null
    status: string
    currentStage: number
    likeCount: number
    saveCount: number
    viewCount: number
    forkCount: number
    collaborationMode: string
    allowFork: boolean
    forkedFromProjectId: string | null
    rootProjectId: string | null
    forkDepth: number
    lastActivityAt: Date
    createdAt: Date
    ownerId: string | null
    ownerName: string | null
    ownerImage: string | null
  }>,
  viewerId: ViewerId,
): Promise<ExploreCard[]> {
  if (rows.length === 0) return []

  const projectIds = rows.map((row) => row.id)
  const { liked, saved, relations } = await loadViewerMaps(projectIds, viewerId)

  const sourceIds = rows.map((row) => row.forkedFromProjectId).filter((id): id is string => Boolean(id))

  const [collabRows, needRows, sourceRows] = await Promise.all([
    db
      .select({
        projectId: projectCollaborators.projectId,
        userId: user.id,
        name: user.name,
        image: user.image,
      })
      .from(projectCollaborators)
      .innerJoin(user, eq(user.id, projectCollaborators.userId))
      .where(inArray(projectCollaborators.projectId, projectIds))
      .limit(200),
    db
      .select()
      .from(projectNeeds)
      .where(and(inArray(projectNeeds.projectId, projectIds), eq(projectNeeds.status, "open")))
      .limit(200),
    sourceIds.length
      ? db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, sourceIds))
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ])

  const sourceMap = new Map(sourceRows.map((row) => [row.id, row.name]))
  const collabMap = new Map<string, ExploreCreator[]>()
  for (const row of collabRows) {
    const list = collabMap.get(row.projectId) ?? []
    if (list.length < 5) list.push({ id: row.userId, name: row.name, avatar: row.image })
    collabMap.set(row.projectId, list)
  }
  const needMap = new Map<string, ExploreCard["openNeeds"]>()
  for (const need of needRows) {
    const list = needMap.get(need.projectId) ?? []
    if (list.length < 2) {
      list.push({
        id: need.id,
        type: need.type,
        label: need.title,
        remaining: Math.max(0, need.requiredCount - need.claimedCount),
      })
    }
    needMap.set(need.projectId, list)
  }

  return rows.map((row) => {
    const status = asStatus(row.status)
    const stageLabel =
      EXPLORE_PIPELINE_STAGES.find((item) => item.sequence === row.currentStage)?.shortTitle ?? "Brief"
    const completedStages = status === "published" ? 6 : Math.max(0, row.currentStage - 1)
    return {
      projectId: row.id,
      title: row.name,
      name: row.name,
      slug: row.slug,
      summary: row.summary,
      coverImage: row.coverImage,
      coverWidth: 480,
      coverHeight: 360,
      category: row.category,
      status,
      activeSummary: row.activeSummary ?? activeSummaryFromStage(row.currentStage, status),
      nextMilestone: row.nextMilestone ?? nextMilestoneFromStage(row.currentStage, status),
      lastActivityAt: toIso(row.lastActivityAt),
      pipeline: {
        currentStage: row.currentStage,
        totalStages: 6,
        completedStages,
        stageLabel,
      },
      creator: mapCreator({ id: row.ownerId, name: row.ownerName, image: row.ownerImage }),
      collaborators: collabMap.get(row.id) ?? [],
      openNeeds: needMap.get(row.id) ?? [],
      collaborationMode: (row.collaborationMode as CollaborationMode) ?? "request",
      lineage: {
        forkedFromProjectId: row.forkedFromProjectId,
        forkedFromTitle: row.forkedFromProjectId ? sourceMap.get(row.forkedFromProjectId) ?? null : null,
        rootProjectId: row.rootProjectId ?? row.id,
        forkDepth: row.forkDepth,
        forkCount: row.forkCount,
      },
      metrics: {
        likeCount: row.likeCount,
        saveCount: row.saveCount,
        viewCount: row.viewCount,
        forkCount: row.forkCount,
      },
      permissions: { allowFork: Boolean(row.allowFork) },
      viewerState: {
        isLiked: liked.has(row.id),
        isSaved: saved.has(row.id),
        relation: relations.get(row.id) ?? "none",
      },
      currentStage: row.currentStage,
      likeCount: row.likeCount,
      createdAt: toIso(row.createdAt),
    }
  })
}

const projectSelect = {
  id: projects.id,
  name: projects.name,
  slug: projects.slug,
  summary: projects.summary,
  activeSummary: projects.activeSummary,
  nextMilestone: projects.nextMilestone,
  coverImage: projects.coverImage,
  category: projects.category,
  status: projects.status,
  currentStage: projects.currentStage,
  likeCount: projects.likeCount,
  saveCount: projects.saveCount,
  viewCount: projects.viewCount,
  forkCount: projects.forkCount,
  collaborationMode: projects.collaborationMode,
  allowFork: projects.allowFork,
  forkedFromProjectId: projects.forkedFromProjectId,
  rootProjectId: projects.rootProjectId,
  forkDepth: projects.forkDepth,
  lastActivityAt: projects.lastActivityAt,
  createdAt: projects.createdAt,
  ownerId: projects.ownerId,
  ownerName: user.name,
  ownerImage: user.image,
}

export async function getExploreProjects(query: ExploreQuery, viewerId?: ViewerId): Promise<ExploreFeedResponse> {
  const { category, status, sort, collaboration, q, limit, offset } = query

  const filters = [eq(projects.visibility, "public")]

  if (category && category !== "全部") filters.push(eq(projects.category, category))
  if (status === "published") filters.push(eq(projects.status, "published"))
  if (status === "wip") filters.push(sql`${projects.status} != 'published'`)
  if (collaboration === "recruiting") {
    filters.push(
      sql`exists (select 1 from project_needs n where n.project_id = ${projects.id} and n.status = 'open')`,
    )
  }
  if (q) {
    filters.push(
      or(
        ilike(projects.name, `%${q}%`),
        ilike(projects.summary, `%${q}%`),
        ilike(projects.activeSummary, `%${q}%`),
        ilike(projects.initialPrompt, `%${q}%`),
      )!,
    )
  }

  let orderBy
  switch (sort) {
    case "hot":
      orderBy = desc(projects.likeCount)
      break
    case "active":
      orderBy = desc(projects.lastActivityAt)
      break
    case "forked":
      orderBy = desc(projects.forkCount)
      break
    case "recruiting":
      orderBy = desc(projects.lastActivityAt)
      break
    case "recommended":
      orderBy = desc(sql`(${projects.likeCount} * 1 + ${projects.forkCount} * 3 + ${projects.viewCount} * 0.1)`)
      break
    default:
      orderBy = desc(projects.createdAt)
  }

  const rows = await db
    .select(projectSelect)
    .from(projects)
    .leftJoin(user, eq(user.id, projects.ownerId))
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  const items = await hydrateCards(rows, viewerId)
  return {
    items,
    nextOffset: items.length === limit ? offset + items.length : undefined,
    hasMore: items.length === limit,
  }
}

export async function getExploreInitial(viewerId?: ViewerId) {
  return getExploreProjects(
    {
      view: "feed",
      status: "all",
      sort: "latest",
      collaboration: "all",
      limit: 24,
      offset: 0,
    },
    viewerId,
  )
}

export async function getExploreProjectDetail(projectId: string, viewerId?: ViewerId): Promise<ExploreProjectDetail | null> {
  const [row] = await db
    .select({ ...projectSelect, visibility: projects.visibility })
    .from(projects)
    .leftJoin(user, eq(user.id, projects.ownerId))
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!row) return null
  if (row.visibility !== "public" && row.ownerId !== viewerId) {
    if (viewerId) {
      const [collab] = await db
        .select({ id: projectCollaborators.id })
        .from(projectCollaborators)
        .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, viewerId)))
        .limit(1)
      if (!collab) return null
    } else {
      return null
    }
  }

  await ensurePublicNodes(projectId)

  await db
    .update(projects)
    .set({ viewCount: sql`${projects.viewCount} + 1` })
    .where(eq(projects.id, projectId))

  const [cards, nodeRows, activityRows, needRows, commentRows, collabRows, childForkRows] = await Promise.all([
    hydrateCards([row], viewerId),
    db
      .select()
      .from(projectPublicNodes)
      .where(eq(projectPublicNodes.projectId, projectId))
      .orderBy(asc(projectPublicNodes.sortOrder)),
    db
      .select({
        id: projectActivities.id,
        projectId: projectActivities.projectId,
        actorId: projectActivities.actorId,
        type: projectActivities.type,
        entityId: projectActivities.entityId,
        metadata: projectActivities.metadata,
        createdAt: projectActivities.createdAt,
        actorName: user.name,
        actorImage: user.image,
      })
      .from(projectActivities)
      .leftJoin(user, eq(user.id, projectActivities.actorId))
      .where(eq(projectActivities.projectId, projectId))
      .orderBy(desc(projectActivities.createdAt))
      .limit(40),
    db
      .select()
      .from(projectNeeds)
      .where(eq(projectNeeds.projectId, projectId))
      .orderBy(desc(projectNeeds.createdAt)),
    db
      .select({
        id: projectComments.id,
        projectId: projectComments.projectId,
        body: projectComments.body,
        createdAt: projectComments.createdAt,
        authorId: user.id,
        authorName: user.name,
        authorImage: user.image,
      })
      .from(projectComments)
      .innerJoin(user, eq(user.id, projectComments.authorId))
      .where(eq(projectComments.projectId, projectId))
      .orderBy(desc(projectComments.createdAt))
      .limit(50),
    db
      .select({
        userId: user.id,
        name: user.name,
        image: user.image,
        role: projectCollaborators.role,
      })
      .from(projectCollaborators)
      .innerJoin(user, eq(user.id, projectCollaborators.userId))
      .where(eq(projectCollaborators.projectId, projectId)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        ownerId: projects.ownerId,
        ownerName: user.name,
        ownerImage: user.image,
      })
      .from(projects)
      .leftJoin(user, eq(user.id, projects.ownerId))
      .where(eq(projects.forkedFromProjectId, projectId))
      .orderBy(desc(projects.createdAt))
      .limit(20),
  ])

  const project = cards[0]
  if (!project) return null

  let claimedNeedIds = new Set<string>()
  if (viewerId && needRows.length) {
    const claims = await db
      .select({ needId: projectNeedClaims.needId })
      .from(projectNeedClaims)
      .where(
        and(
          eq(projectNeedClaims.userId, viewerId),
          eq(projectNeedClaims.status, "active"),
          inArray(
            projectNeedClaims.needId,
            needRows.map((n) => n.id),
          ),
        ),
      )
    claimedNeedIds = new Set(claims.map((c) => c.needId))
  }

  const nodes: PublicProjectNode[] = nodeRows.map((node) => ({
    id: node.id,
    projectId: node.projectId,
    type: node.type,
    title: node.title,
    summary: node.summary,
    image: node.image,
    stage: node.stage,
    status: node.status,
    position: { x: node.positionX, y: node.positionY },
    sourceNodeId: node.sourceNodeId,
    artifactId: node.artifactId,
    forkable: node.forkable,
    sortOrder: node.sortOrder,
  }))

  const activities: ProjectActivityItem[] = activityRows.map((act) => ({
    id: act.id,
    projectId: act.projectId,
    actor: mapCreator({ id: act.actorId, name: act.actorName, image: act.actorImage }),
    type: act.type,
    entityId: act.entityId,
    metadata: (act.metadata ?? {}) as Record<string, unknown>,
    createdAt: toIso(act.createdAt),
  }))

  const needs: ProjectNeedItem[] = needRows.map((need) => ({
    id: need.id,
    projectId: need.projectId,
    type: need.type,
    title: need.title,
    description: need.description,
    requiredCount: need.requiredCount,
    claimedCount: need.claimedCount,
    remaining: Math.max(0, need.requiredCount - need.claimedCount),
    requiredRole: need.requiredRole,
    status: need.status,
    createdAt: toIso(need.createdAt),
    viewerClaimed: claimedNeedIds.has(need.id),
  }))

  const comments: ProjectCommentItem[] = commentRows.map((c) => ({
    id: c.id,
    projectId: c.projectId,
    author: { id: c.authorId, name: c.authorName, avatar: c.authorImage },
    body: c.body,
    createdAt: toIso(c.createdAt),
  }))

  let sourceProject: ExploreProjectDetail["sourceProject"] = null
  if (row.forkedFromProjectId) {
    const [source] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, row.forkedFromProjectId))
      .limit(1)
    if (source) sourceProject = { id: source.id, title: source.name }
  }

  return {
    project,
    nodes,
    activities,
    needs,
    comments,
    collaborators: collabRows.map((c) => ({
      id: c.userId,
      name: c.name,
      avatar: c.image,
      role: c.role,
    })),
    publication: {
      visibility: row.visibility === "public" ? "public" : "private",
      allowFork: row.allowFork,
      collaborationMode: (row.collaborationMode as CollaborationMode) ?? "request",
    },
    sourceProject,
    childForks: childForkRows.map((fork) => ({
      id: fork.id,
      title: fork.name,
      creator: mapCreator({ id: fork.ownerId, name: fork.ownerName, image: fork.ownerImage }),
      createdAt: toIso(fork.createdAt),
    })),
  }
}

export async function getGlobalActivityFeed(limit = 40): Promise<ProjectActivityItem[]> {
  const rows = await db
    .select({
      id: projectActivities.id,
      projectId: projectActivities.projectId,
      actorId: projectActivities.actorId,
      type: projectActivities.type,
      entityId: projectActivities.entityId,
      metadata: projectActivities.metadata,
      createdAt: projectActivities.createdAt,
      actorName: user.name,
      actorImage: user.image,
      projectTitle: projects.name,
      visibility: projects.visibility,
    })
    .from(projectActivities)
    .innerJoin(projects, eq(projects.id, projectActivities.projectId))
    .leftJoin(user, eq(user.id, projectActivities.actorId))
    .where(eq(projects.visibility, "public"))
    .orderBy(desc(projectActivities.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    actor: mapCreator({ id: row.actorId, name: row.actorName, image: row.actorImage }),
    type: row.type,
    entityId: row.entityId,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: toIso(row.createdAt),
    projectTitle: row.projectTitle,
  }))
}
