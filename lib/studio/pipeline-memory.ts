import { ALL_PIPELINE_STAGES, PIPELINE_STAGES } from "./artifact-pipeline"
import { TASK_PLAN, DEMO_BRIEF, DEMO_RESEARCH, DEMO_VISUAL_SYSTEM, DEMO_CAMPAIGN, DEMO_VALIDATION } from "./demo-data"
import { buildCampaignFoundation } from "./campaign-foundation"
import type { ArtifactContent, ArtifactType, ReleasePackageContent, StudioArtifact, StudioArtifactRevision, StudioProjectState } from "./types"

const CONTENT: Partial<Record<ArtifactType, ArtifactContent>> = {
  brief: DEMO_BRIEF,
  research: DEMO_RESEARCH,
  "campaign-foundation": buildCampaignFoundation(DEMO_BRIEF, DEMO_RESEARCH),
  "visual-system": DEMO_VISUAL_SYSTEM,
  campaign: DEMO_CAMPAIGN,
  validation: DEMO_VALIDATION,
}

const states = new Map<string, StudioProjectState>()
const uid = () => crypto.randomUUID()

export function createMemoryProject(projectId: string, name = "未命名发布企划", prompt = "") {
  const existing = states.get(projectId)
  if (existing) return existing
  const now = new Date().toISOString()
  const artifacts: StudioArtifact[] = ALL_PIPELINE_STAGES.map((stage) => ({
    id: uid(), projectId, type: stage.type, title: stage.title,
    status: stage.sequence === 1 ? "ready" as const : "locked" as const,
    currentRevisionId: null, sortOrder: stage.sequence - 1, sequence: stage.sequence,
    approvedAt: null, meta: {}, createdAt: now,
  }))
  const revisions: StudioArtifactRevision[] = []
  for (const artifact of artifacts) {
    const content = CONTENT[artifact.type]
    if (!content) continue
    const revision = { id: uid(), artifactId: artifact.id, version: 1, content, prompt, createdAt: now }
    revisions.push(revision)
    artifact.currentRevisionId = revision.id
  }
  const state: StudioProjectState = {
    project: { id: projectId, name, slug: `launch-${projectId.slice(0, 6)}`, status: "planning", initialPrompt: prompt, createdAt: now, updatedAt: now },
    tasks: TASK_PLAN.map((task, index) => ({ id: uid(), projectId, type: task.type, title: task.title, status: "pending", progress: 0, sortOrder: index, agentNote: task.agentNote, startedAt: null, completedAt: null })),
    artifacts, revisions, signals: [],
  }
  states.set(projectId, state)
  return state
}

export function getMemoryProject(projectId: string) { return states.get(projectId) ?? null }

export function generateMemoryArtifact(projectId: string, artifactId: string, instruction = "") {
  const state = createMemoryProject(projectId)
  const artifact = state.artifacts.find((item) => item.id === artifactId)
  if (!artifact || !["ready", "failed", "stale"].includes(artifact.status)) throw new Error("该节点尚未解锁")
  const current = state.revisions.find((revision) => revision.id === artifact.currentRevisionId)
  const content = current?.content ?? CONTENT[artifact.type]
  if (!content) throw new Error("当前阶段缺少内容模板")
  const revision = { id: uid(), artifactId, version: Math.max(0, ...state.revisions.filter((item) => item.artifactId === artifactId).map((item) => item.version)) + 1, content, prompt: instruction || `生成${artifact.title}`, createdAt: new Date().toISOString() }
  state.revisions.push(revision)
  artifact.currentRevisionId = revision.id
  artifact.status = "review"
  const task = state.tasks.find((item) => item.type === artifact.type)
  if (task) { task.status = "done"; task.progress = 100; task.completedAt = new Date().toISOString() }
  state.project.status = "reviewing"
  return revision
}

export function approveMemoryArtifact(projectId: string, artifactId: string) {
  const state = createMemoryProject(projectId)
  const current = state.artifacts.find((item) => item.id === artifactId)
  if (!current || !["review", "stale"].includes(current.status)) throw new Error("只有待确认的产物可以批准")
  current.status = "approved"
  current.approvedAt = new Date().toISOString()
  const next = state.artifacts.find((item) => item.sequence === (current.sequence ?? 0) + 1)
  if (next) next.status = "ready"
  state.project.status = state.artifacts.filter((item) => item.type !== "release-package").every((item) => item.status === "approved") ? "publish_ready" : "planning"
}

export function reviseMemoryArtifact(projectId: string, artifactId: string, feedback: string) {
  const state = createMemoryProject(projectId)
  const current = state.artifacts.find((item) => item.id === artifactId)
  if (!current) throw new Error("Artifact not found")
  current.status = "ready"; current.meta = { feedback }
  const task = state.tasks.find((item) => item.type === current.type)
  if (task) { task.status = "pending"; task.progress = 0; task.agentNote = `修改要求：${feedback}` }
  state.artifacts.filter((item) => item.type !== "release-package" && (item.sequence ?? 0) > (current.sequence ?? 0) && ["review", "approved"].includes(item.status)).forEach((item) => { item.status = "stale" })
  const release = state.artifacts.find((item) => item.type === "release-package")
  if (release?.currentRevisionId) release.status = "stale"
  state.project.status = "planning"
}

export function assembleMemoryPackage(projectId: string) {
  const state = createMemoryProject(projectId)
  const sources = PIPELINE_STAGES.map((stage) => state.artifacts.find((item) => item.type === stage.type))
  if (sources.some((item) => item?.status !== "approved")) throw new Error("请先确认 1–6 的全部产物")
  const foundation = buildCampaignFoundation(DEMO_BRIEF, DEMO_RESEARCH)
  const content: ReleasePackageContent = {
    executiveSummary: `${state.project.name} 已完成从产品定义、市场洞察、产品定案、视觉系统到众筹页面和发布计划的完整准备。`,
    positioning: `${DEMO_BRIEF.tagline}，面向${DEMO_BRIEF.audience}。`,
    marketConclusion: DEMO_RESEARCH.opportunity,
    foundationDecision: `${foundation.product.launchVersion}；${foundation.story.thesis}`,
    readinessStatus: foundation.readiness.status,
    publicationMode: foundation.readiness.publicationMode,
    visualGuideline: `${DEMO_VISUAL_SYSTEM.style}；${DEMO_VISUAL_SYSTEM.keywords.join("、")}。`,
    launchChecklist: DEMO_VALIDATION.checklist,
    sources: sources.map((item) => ({ artifactId: item!.id, type: item!.type, version: state.revisions.find((revision) => revision.id === item!.currentRevisionId)?.version ?? 1 })),
  }
  const release = state.artifacts.find((item) => item.type === "release-package")!
  const revision = { id: uid(), artifactId: release.id, version: 1, content, prompt: "组装六项已批准 Artifact", createdAt: new Date().toISOString() }
  state.revisions.push(revision); release.currentRevisionId = revision.id; release.status = "review"
  return revision
}
