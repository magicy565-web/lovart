import "server-only"

import { db } from "@/lib/db"
import { projects, tasks, artifacts, artifactRevisions, validationSignals, campaignEvidence, publicationSnapshots } from "@/lib/db/schema"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { TASK_PLAN } from "@/lib/studio/demo-data"
import {
  ALL_PIPELINE_STAGES,
  PIPELINE_STAGES,
  normalizeArtifactStatus,
  normalizeArtifactType,
  stageFor,
} from "@/lib/studio/artifact-pipeline"
import {
  buildCampaignFoundation,
  buildCampaignFromFoundation,
  buildVisualSystemFromFoundation,
  parseCampaignFoundation,
  synthesizeCampaignFoundation,
  withEvaluatedReadiness,
} from "@/lib/studio/campaign-foundation"
import { generateBriefFromPrompt, generateValidationFromFoundation } from "@/lib/studio/artifact-generators"
import { researchMarketForBrief } from "@/lib/research/market-research"
import { applyEvidenceAvailability } from "@/lib/campaign/evidence"
import {
  evaluatePublicationReadiness,
} from "@/lib/studio/concept-validation"
import type {
  ArtifactContent,
  ArtifactType,
  BriefContent,
  CampaignFoundationContent,
  CampaignEvidenceRecord,
  CampaignContent,
  ReleasePackageContent,
  ResearchContent,
  StudioArtifact,
  StudioArtifactRevision,
  ValidationContent,
  VisualSystemContent,
} from "@/lib/studio/types"

function projectNameFromPrompt(prompt: string) {
  const match = prompt.match(/(?:设计|打造|做)(?:一款|一个|一套)?([^，。；\n]{2,28})/)
  return (match?.[1] || prompt).trim().slice(0, 32) || "未命名发布企划"
}

function projectSlug() {
  return `campaign-${Math.random().toString(36).slice(2, 10)}`
}

async function seedPipeline(projectId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`)
    const existingTasks = await tx.select().from(tasks).where(eq(tasks.projectId, projectId))
    for (const [index, task] of TASK_PLAN.entries()) {
      const existing = existingTasks.find((item) => item.type === task.type)
      if (existing) {
        await tx.update(tasks).set({ title: task.title, agentNote: task.agentNote, sortOrder: index }).where(eq(tasks.id, existing.id))
      } else {
        await tx.insert(tasks).values({
          projectId,
          type: task.type,
          title: task.title,
          agentNote: task.agentNote,
          sortOrder: index,
          status: "pending",
        })
      }
    }

    const existingArtifacts = await tx.select().from(artifacts).where(eq(artifacts.projectId, projectId))
    const artifactByType = new Map(existingArtifacts.map((item) => [normalizeArtifactType(item.type), item]))
    for (const stage of ALL_PIPELINE_STAGES) {
      let artifact = artifactByType.get(stage.type)
      if (!artifact) {
        const dependency = stage.dependsOn ? artifactByType.get(stage.dependsOn) : null
        const status = stage.sequence === 1 || dependency?.status === "approved" ? "ready" : "locked"
        ;[artifact] = await tx
          .insert(artifacts)
          .values({ projectId, type: stage.type, title: stage.title, sortOrder: stage.sequence - 1, status })
          .returning()
        artifactByType.set(stage.type, artifact)
      } else if (artifact.title !== stage.title || artifact.sortOrder !== stage.sequence - 1) {
        ;[artifact] = await tx
          .update(artifacts)
          .set({ title: stage.title, sortOrder: stage.sequence - 1 })
          .where(eq(artifacts.id, artifact.id))
          .returning()
        artifactByType.set(stage.type, artifact)
      }
    }

    for (const stage of ALL_PIPELINE_STAGES) {
      if (!stage.dependsOn) continue
      const artifact = artifactByType.get(stage.type)
      const dependency = artifactByType.get(stage.dependsOn)
      if (!artifact || !dependency) continue
      if (dependency.status !== "approved" && artifact.status !== "locked") {
        await tx.update(artifacts).set({ status: "locked" }).where(eq(artifacts.id, artifact.id))
        artifactByType.set(stage.type, { ...artifact, status: "locked" })
      } else if (dependency.status === "approved" && artifact.status === "locked") {
        const status = artifact.currentRevisionId ? "stale" : "ready"
        await tx.update(artifacts).set({ status }).where(eq(artifacts.id, artifact.id))
        artifactByType.set(stage.type, { ...artifact, status })
      }
    }
  })
}

export async function initializeProjectPipeline(
  projectId: string,
  name = "未命名发布企划",
  initialPrompt = "",
  ownerId?: string | null,
) {
  let [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) {
    ;[project] = await db
      .insert(projects)
      .values({
        id: projectId,
        name: name === "未命名发布企划" && initialPrompt ? projectNameFromPrompt(initialPrompt) : name,
        slug: projectSlug(),
        status: "planning",
        initialPrompt,
        ownerId: ownerId ?? null,
      })
      .onConflictDoNothing()
      .returning()
    if (!project) {
      ;[project] = await db.select().from(projects).where(eq(projects.id, projectId))
    }
  }
  if (!project) throw new Error("项目初始化失败")
  // Claim ownership for legacy ownerless projects when a user is present
  if (ownerId && !project.ownerId) {
    ;[project] = await db
      .update(projects)
      .set({ ownerId, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), sql`${projects.ownerId} is null`))
      .returning()
    if (!project) {
      ;[project] = await db.select().from(projects).where(eq(projects.id, projectId))
    }
  }
  await seedPipeline(project!.id)
  if (name !== "未命名发布企划" && name !== project!.name) {
    ;[project] = await db.update(projects).set({ name, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning()
  }
  return project!
}

export async function createProject(initialPrompt: string, ownerId?: string | null) {
  const slug = projectSlug()
  const [project] = await db
    .insert(projects)
    .values({
      name: projectNameFromPrompt(initialPrompt),
      slug,
      status: "planning",
      initialPrompt,
      ownerId: ownerId ?? null,
    })
    .returning()

  await seedPipeline(project.id)

  return { projectId: project.id, slug }
}

export async function getProjectState(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) return null

  const taskRows = await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.sortOrder))
  const rawArtifacts = await db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).orderBy(asc(artifacts.sortOrder))
  const revisionRows = rawArtifacts.length
    ? await db
        .select()
        .from(artifactRevisions)
        .where(sql`${artifactRevisions.artifactId} IN (${sql.join(rawArtifacts.map((artifact) => sql`${artifact.id}`), sql`, `)})`)
        .orderBy(asc(artifactRevisions.version))
    : []
  const signals = await db.select().from(validationSignals).where(eq(validationSignals.projectId, projectId)).orderBy(desc(validationSignals.createdAt))
  const [publication] = await db.select().from(publicationSnapshots).where(and(eq(publicationSnapshots.projectId, projectId), eq(publicationSnapshots.status, "active"))).orderBy(desc(publicationSnapshots.version)).limit(1)

  const artifactRows = rawArtifacts.map((artifact) => ({
    ...artifact,
    type: normalizeArtifactType(artifact.type),
    status: normalizeArtifactStatus(artifact.status, artifact.sortOrder + 1),
    sequence: artifact.sortOrder + 1,
  })) as StudioArtifact[]

  const foundationArtifact = artifactRows.find((artifact) => artifact.type === "campaign-foundation")
  const foundationRevision = foundationArtifact
    ? (revisionRows as StudioArtifactRevision[]).find((revision) => revision.id === foundationArtifact.currentRevisionId)
    : null
  const foundationContent = foundationRevision?.content && typeof foundationRevision.content === "object"
    ? (foundationRevision.content as CampaignFoundationContent)
    : null
  const releaseArtifact = artifactRows.find((artifact) => artifact.type === "release-package")
  let publicationReadiness
  try {
    publicationReadiness = evaluatePublicationReadiness({
      artifacts: artifactRows,
      foundation: foundationContent,
      releaseApproved: releaseArtifact?.status === "approved",
    })
  } catch {
    publicationReadiness = {
      path: "incomplete" as const,
      canPublish: false,
      missingApproved: ["campaign-foundation" as const],
      readinessStatus: null,
      publicationMode: null,
      blockers: ["Campaign Foundation 内容无效，请重新生成定案"],
      summary: "Campaign Foundation 内容无效，请重新生成定案。",
    }
  }

  let forkOrigin: { id: string; title: string } | null = null
  if (project.forkedFromProjectId) {
    const [source] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, project.forkedFromProjectId))
      .limit(1)
    if (source) forkOrigin = { id: source.id, title: source.name }
  }

  return {
    project,
    tasks: taskRows,
    artifacts: artifactRows,
    revisions: revisionRows as StudioArtifactRevision[],
    signals,
    publication: publication ? { id: publication.id, version: publication.version, mode: publication.mode, status: publication.status, publishedAt: publication.publishedAt } : null,
    publicationReadiness,
    forkOrigin,
  }
}

export async function syncCanvasArtifact(
  projectId: string,
  artifactType: ArtifactType,
  operation: "generate" | "approve" | "revise",
  feedback = "",
) {
  const state = await getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.type === artifactType)
  if (!artifact) throw new Error("找不到对应的流水线节点")

  // 画布工具可能已经生成了真实内容，而服务端内存状态仍是 ready。
  // 批准前幂等地补齐 review 状态，保证两端始终能推进同一阶段。
  if (operation === "generate") {
    if (["ready", "failed", "stale"].includes(artifact.status)) {
      if (artifact.type === "release-package") await assembleReleasePackage(projectId)
      else await generateArtifactDraft(projectId, artifact.id, feedback)
    }
  } else if (operation === "approve") {
    if (["ready", "failed", "stale"].includes(artifact.status)) {
      if (artifact.type === "release-package") await assembleReleasePackage(projectId)
      else await generateArtifactDraft(projectId, artifact.id, "同步画布已生成产物")
    }
    const latest = await getProjectState(projectId)
    const current = latest?.artifacts.find((item) => item.type === artifactType)
    if (current?.status === "review") await approveArtifact(projectId, current.id)
  } else {
    if (!feedback.trim()) throw new Error("请填写修改要求")
    await requestArtifactRevision(projectId, artifact.id, feedback.trim())
    if (artifact.type === "release-package") await assembleReleasePackage(projectId)
    else await generateArtifactDraft(projectId, artifact.id, feedback.trim())
  }

  const updated = await getProjectState(projectId)
  if (!updated) throw new Error("无法读取更新后的流水线")
  return updated.artifacts.map((item) => ({
    type: item.type,
    status: item.status,
    version: updated.revisions.filter((revision) => revision.artifactId === item.id).at(-1)?.version ?? 0,
    feedback: item.meta?.feedback,
    error: item.meta?.error,
  }))
}

export async function startArtifactGeneration(projectId: string, artifactId: string) {
  const state = await getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.id === artifactId)
  if (!artifact || !["ready", "review", "failed", "stale"].includes(artifact.status)) throw new Error("该节点尚未解锁")

  await db.update(artifacts).set({ status: "generating" }).where(and(eq(artifacts.id, artifactId), eq(artifacts.projectId, projectId)))
  await db.update(tasks).set({ status: "running", startedAt: new Date() }).where(and(eq(tasks.projectId, projectId), eq(tasks.type, artifact.type)))
  await db.update(projects).set({ status: "generating", updatedAt: new Date() }).where(eq(projects.id, projectId))
}

export async function generateArtifactDraft(projectId: string, artifactId: string, instruction = "") {
  const state = await getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.id === artifactId)
  if (!state || !artifact || !["ready", "failed", "stale"].includes(artifact.status)) throw new Error("该节点尚未解锁")
  const stage = stageFor(artifact.type)
  if (stage?.dependsOn) {
    const dependency = state?.artifacts.find((item) => item.type === stage.dependsOn)
    if (dependency?.status !== "approved") throw new Error(`请先批准${stageFor(stage.dependsOn)?.title ?? "上游产物"}`)
  }
  await startArtifactGeneration(projectId, artifactId)
  const current = state.revisions.find((revision) => revision.id === artifact.currentRevisionId)
  const currentContent = (type: ArtifactType) => {
    const item = state.artifacts.find((candidate) => candidate.type === type)
    return state.revisions.find((revision) => revision.id === item?.currentRevisionId)?.content
  }
  try {
    let content: ArtifactContent | undefined = current?.content
    if (artifact.type === "brief") {
      content = await generateBriefFromPrompt(`${state.project.initialPrompt || state.project.name}${instruction ? `\n补充要求：${instruction}` : ""}`)
      await db.update(projects).set({ name: (content as BriefContent).productName, updatedAt: new Date() }).where(eq(projects.id, projectId))
    } else if (artifact.type === "research") {
      const brief = currentContent("brief") as BriefContent | undefined
      if (!brief) throw new Error("请先完成并批准产品 Brief")
      content = await researchMarketForBrief(brief)
    } else if (artifact.type === "campaign-foundation") {
      const brief = currentContent("brief") as BriefContent | undefined
      const research = currentContent("research") as ResearchContent | undefined
      if (!brief || !research) throw new Error("请先完成并批准产品 Brief 与市场研究")
      if (current?.content) {
        const parsed = parseCampaignFoundation(current.content)
        content = synthesizeCampaignFoundation(parsed, parsed.selection.selectedDirectionIds, instruction || parsed.selection.instruction)
      } else {
        content = buildCampaignFoundation(brief, research)
      }
    } else if (artifact.type === "visual-system") {
      const foundation = currentContent("campaign-foundation")
      if (!foundation) throw new Error("请先完成并批准 Campaign Foundation")
      const existing = current?.content && "items" in current.content ? current.content as VisualSystemContent : undefined
      content = buildVisualSystemFromFoundation(parseCampaignFoundation(foundation), existing)
      const media = await db.select().from(campaignEvidence).where(and(eq(campaignEvidence.projectId, projectId), eq(campaignEvidence.status, "approved")))
      ;(content as VisualSystemContent).items = media
        .filter((item) => item.mediaType === "image")
        .slice(0, 8)
        .map((item, index) => ({
          key: item.role === "hero_product" && index === 0 ? "hero" : `${item.role}-${item.id}`,
          label: item.label,
          src: item.url,
          alt: `${item.label}（${item.truthClass === "generated_concept" ? "生成概念" : "已批准证据"}）`,
          evidenceId: item.id,
          truthClass: item.truthClass as VisualSystemContent["items"][number]["truthClass"],
          provenance: item.provenance,
        }))
    } else if (artifact.type === "campaign") {
      const foundation = currentContent("campaign-foundation")
      const brief = currentContent("brief") as BriefContent | undefined
      if (!foundation || !brief) throw new Error("请先完成并批准 Campaign Foundation")
      content = buildCampaignFromFoundation(parseCampaignFoundation(foundation), brief, current?.content && "heroTitle" in current.content ? current.content as CampaignContent : undefined)
    } else if (artifact.type === "validation") {
      const foundation = currentContent("campaign-foundation")
      if (!foundation) throw new Error("请先完成并批准 Campaign Foundation")
      content = generateValidationFromFoundation(parseCampaignFoundation(foundation))
    }
    if (!content) throw new Error("当前阶段缺少可生成的内容")
    return submitArtifactForReview(projectId, artifactId, content, instruction || `生成${artifact.title}`)
  } catch (error) {
    await db.update(artifacts).set({ status: "failed" }).where(eq(artifacts.id, artifactId))
    await db.update(tasks).set({ status: "pending", progress: 0, agentNote: error instanceof Error ? error.message : "生成失败" }).where(and(eq(tasks.projectId, projectId), eq(tasks.type, artifact.type)))
    await db.update(projects).set({ status: "planning", updatedAt: new Date() }).where(eq(projects.id, projectId))
    throw error
  }
}

export async function saveGeneratedArtifact(
  projectId: string,
  type: "brief" | "research",
  content: BriefContent | ResearchContent,
  prompt: string,
) {
  await initializeProjectPipeline(projectId)
  const state = await getProjectState(projectId)
  if (!state) throw new Error("项目不存在")
  const artifact = state.artifacts.find((item) => item.type === type)
  if (!artifact) throw new Error("Artifact 不存在")

  const previousRevisionId = artifact.currentRevisionId
  const revision = await saveRevision(artifact.id, content, prompt)
  const status = type === "research" && artifact.status === "locked" ? "locked" : "review"
  await db.update(artifacts).set({ status }).where(eq(artifacts.id, artifact.id))
  await db
    .update(tasks)
    .set({ status: "done", progress: 100, completedAt: new Date() })
    .where(and(eq(tasks.projectId, projectId), eq(tasks.type, type)))

  const isInitialBrief = type === "brief" && !previousRevisionId
  for (const downstream of state.artifacts.filter((item) => (item.sequence ?? 0) > (artifact.sequence ?? 0))) {
    const downstreamStatus = isInitialBrief ? "locked" : downstream.currentRevisionId ? "stale" : "locked"
    await db.update(artifacts).set({ status: downstreamStatus }).where(eq(artifacts.id, downstream.id))
  }

  await db
    .update(projects)
    .set(status === "review" ? { status: "reviewing", updatedAt: new Date() } : { updatedAt: new Date() })
    .where(eq(projects.id, projectId))
  return revision
}

export async function submitArtifactForReview(
  projectId: string,
  artifactId: string,
  content: ArtifactContent,
  prompt: string,
) {
  const [artifact] = await db.select().from(artifacts).where(and(eq(artifacts.id, artifactId), eq(artifacts.projectId, projectId)))
  if (!artifact) throw new Error("Artifact not found")
  const revision = await saveRevision(artifactId, content, prompt)
  await db.update(artifacts).set({ status: "review" }).where(eq(artifacts.id, artifactId))
  await db.update(tasks).set({ status: "done", progress: 100, completedAt: new Date() }).where(and(eq(tasks.projectId, projectId), eq(tasks.type, normalizeArtifactType(artifact.type))))
  await db.update(projects).set({ status: "reviewing", updatedAt: new Date() }).where(eq(projects.id, projectId))
  return revision
}

export async function approveArtifact(projectId: string, artifactId: string) {
  const state = await getProjectState(projectId)
  const current = state?.artifacts.find((artifact) => artifact.id === artifactId)
  if (!current || !["review", "stale"].includes(current.status)) throw new Error("只有待确认的产物可以批准")
  const stage = stageFor(current.type)
  if (stage?.dependsOn) {
    const dependency = state?.artifacts.find((artifact) => artifact.type === stage.dependsOn)
    if (dependency?.status !== "approved") throw new Error(`请先批准${stageFor(stage.dependsOn)?.title ?? "上游产物"}`)
  }

  if (current.type === "campaign-foundation") {
    const content = state?.revisions.find((revision) => revision.id === current.currentRevisionId)?.content
    if (!content) throw new Error("Campaign Foundation 缺少当前版本")
    const foundation = withEvaluatedReadiness(parseCampaignFoundation(content))
    if (foundation.readiness.status === "blocked") {
      throw new Error(`当前定案仍被阻塞：${foundation.readiness.blockers.join("；")}`)
    }
  }

  await db.update(artifacts).set({ status: "approved" }).where(and(eq(artifacts.id, artifactId), eq(artifacts.projectId, projectId)))
  const next = state?.artifacts.find((artifact) => artifact.sequence === (current.sequence ?? 0) + 1)
  if (next?.status === "locked") {
    await db
      .update(artifacts)
      .set({ status: next.currentRevisionId ? "review" : "ready" })
      .where(eq(artifacts.id, next.id))
  }

  const approvedCount = state?.artifacts.filter((artifact) => artifact.type !== "release-package" && (artifact.status === "approved" || artifact.id === artifactId)).length ?? 0
  await db.update(projects).set({ status: approvedCount === PIPELINE_STAGES.length ? "publish_ready" : "planning", updatedAt: new Date() }).where(eq(projects.id, projectId))
}

export async function requestArtifactRevision(projectId: string, artifactId: string, feedback: string) {
  const state = await getProjectState(projectId)
  const current = state?.artifacts.find((artifact) => artifact.id === artifactId)
  if (!current) throw new Error("Artifact not found")

  await db.update(artifacts).set({ status: "ready" }).where(eq(artifacts.id, artifactId))
  await db.update(tasks).set({ status: "pending", progress: 0, agentNote: `修改要求：${feedback}` }).where(and(eq(tasks.projectId, projectId), eq(tasks.type, current.type)))

  const downstream = state?.artifacts.filter((artifact) => artifact.type !== "release-package" && (artifact.sequence ?? 0) > (current.sequence ?? 0)) ?? []
  for (const artifact of downstream) {
    if (["review", "approved"].includes(artifact.status)) await db.update(artifacts).set({ status: "stale" }).where(eq(artifacts.id, artifact.id))
  }
  const release = state?.artifacts.find((artifact) => artifact.type === "release-package")
  if (release?.currentRevisionId) await db.update(artifacts).set({ status: "stale" }).where(eq(artifacts.id, release.id))
  await db.update(projects).set({ status: "planning", updatedAt: new Date() }).where(eq(projects.id, projectId))
}

async function saveFoundationReview(projectId: string, content: CampaignFoundationContent, prompt: string) {
  const state = await getProjectState(projectId)
  if (!state) throw new Error("项目不存在")
  const foundation = state?.artifacts.find((artifact) => artifact.type === "campaign-foundation")
  if (!foundation) throw new Error("Campaign Foundation 节点不存在")
  if (foundation.status === "locked") throw new Error("请先批准市场研究")
  const evidenceRows = await db.select().from(campaignEvidence).where(eq(campaignEvidence.projectId, projectId))
  const synchronized = applyEvidenceAvailability(parseCampaignFoundation(content), evidenceRows as CampaignEvidenceRecord[])
  const normalized = withEvaluatedReadiness(synchronized)
  const revision = await saveRevision(foundation.id, normalized, prompt)
  await db.update(artifacts).set({ status: "review" }).where(eq(artifacts.id, foundation.id))

  const downstream = state.artifacts.filter((artifact) => artifact.type !== "release-package" && (artifact.sequence ?? 0) > (foundation.sequence ?? 0))
  for (const artifact of downstream) {
    if (artifact.currentRevisionId) await db.update(artifacts).set({ status: "stale" }).where(eq(artifacts.id, artifact.id))
    else await db.update(artifacts).set({ status: "locked" }).where(eq(artifacts.id, artifact.id))
  }
  const release = state.artifacts.find((artifact) => artifact.type === "release-package")
  if (release?.currentRevisionId) await db.update(artifacts).set({ status: "stale" }).where(eq(artifacts.id, release.id))
  await db.update(projects).set({ status: "reviewing", updatedAt: new Date() }).where(eq(projects.id, projectId))
  return { revision, content: normalized }
}

export async function synthesizeCampaignFoundationDecision(
  projectId: string,
  selectedDirectionIds: string[],
  instruction: string,
) {
  const state = await getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.type === "campaign-foundation")
  const current = state?.revisions.find((revision) => revision.id === artifact?.currentRevisionId)?.content
  if (!current) throw new Error("请先生成候选路线")
  const content = synthesizeCampaignFoundation(parseCampaignFoundation(current), selectedDirectionIds, instruction.trim())
  return saveFoundationReview(projectId, content, instruction.trim() || "合成所选候选路线")
}

export async function saveCampaignFoundation(projectId: string, content: CampaignFoundationContent) {
  return saveFoundationReview(projectId, content, "人工调整 Campaign Foundation")
}

export async function assembleReleasePackage(projectId: string) {
  const state = await getProjectState(projectId)
  if (!state) throw new Error("Project not found")
  const sourceArtifacts = PIPELINE_STAGES.map((stage) => state.artifacts.find((artifact) => artifact.type === stage.type))
  if (sourceArtifacts.some((artifact) => !artifact || artifact.status !== "approved")) throw new Error("请先确认 1–6 的全部产物")

  const sourceContents = new Map<ArtifactType, ArtifactContent>()
  const sources = sourceArtifacts.map((artifact) => {
    const revisions = state.revisions.filter((revision) => revision.artifactId === artifact!.id)
    const current = revisions.find((revision) => revision.id === artifact!.currentRevisionId) ?? revisions.at(-1)
    if (!current) throw new Error(`${artifact!.title} 缺少已批准版本`)
    sourceContents.set(artifact!.type, current.content)
    return { artifactId: artifact!.id, type: artifact!.type, version: current?.version ?? 1 }
  })
  const brief = sourceContents.get("brief") as BriefContent
  const research = sourceContents.get("research") as ResearchContent
  const foundation = parseCampaignFoundation(sourceContents.get("campaign-foundation"))
  const visualSystem = sourceContents.get("visual-system") as VisualSystemContent
  const validation = sourceContents.get("validation") as ValidationContent
  const content: ReleasePackageContent = {
    executiveSummary: `${state.project.name} 已完成从产品定义、市场验证、产品定案、视觉系统到众筹页面与发布计划的完整准备。`,
    positioning: `${brief.tagline}，面向${brief.audience}。`,
    marketConclusion: research.opportunity,
    foundationDecision: `${foundation.product.launchVersion}；${foundation.story.thesis}`,
    readinessStatus: foundation.readiness.status,
    publicationMode: foundation.readiness.publicationMode,
    visualGuideline: `${visualSystem.style}；核心关键词：${visualSystem.keywords.join("、")}。`,
    launchChecklist: validation.checklist,
    sources,
  }
  const release = state.artifacts.find((artifact) => artifact.type === "release-package")
  if (!release) throw new Error("Release package not found")
  const revision = await saveRevision(release.id, content, "组装六项已批准 Artifact")
  await db.update(artifacts).set({ status: "review" }).where(eq(artifacts.id, release.id))
  return revision
}

export async function startTask(projectId: string, taskId: string) {
  await db.update(tasks).set({ status: "running", startedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
  await db.update(projects).set({ status: "generating", updatedAt: new Date() }).where(eq(projects.id, projectId))
}

export async function completeTask(projectId: string, taskId: string) {
  const [task] = await db.update(tasks).set({ status: "done", progress: 100, completedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).returning()
  if (!task) return
  const artifactType = normalizeArtifactType(task.type)
  await db.update(artifacts).set({ status: "review" }).where(and(eq(artifacts.projectId, projectId), eq(artifacts.type, artifactType)))
  await db.update(projects).set({ status: "reviewing", updatedAt: new Date() }).where(eq(projects.id, projectId))
}

export async function saveRevision(artifactId: string, content: ArtifactContent, prompt: string) {
  const [latest] = await db.select().from(artifactRevisions).where(eq(artifactRevisions.artifactId, artifactId)).orderBy(desc(artifactRevisions.version)).limit(1)
  const [revision] = await db.insert(artifactRevisions).values({ artifactId, version: (latest?.version ?? 0) + 1, content, prompt }).returning()
  await db.update(artifacts).set({ currentRevisionId: revision.id }).where(eq(artifacts.id, artifactId))
  return revision
}

export async function switchRevision(artifactId: string, revisionId: string) {
  const [revision] = await db.select().from(artifactRevisions).where(and(eq(artifactRevisions.id, revisionId), eq(artifactRevisions.artifactId, artifactId)))
  if (!revision) throw new Error("Revision not found")
  await db.update(artifacts).set({ currentRevisionId: revisionId, status: "review" }).where(eq(artifacts.id, artifactId))
  return revision
}

export async function renameProject(projectId: string, name: string) {
  await db.update(projects).set({ name, updatedAt: new Date() }).where(eq(projects.id, projectId))
}

export {
  publishProject,
  approveFoundationAndPublishConcept,
  unpublishProject,
  recordSignal,
  getSignalCounts,
} from "@/features/studio/server/publication"
