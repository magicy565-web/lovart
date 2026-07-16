// 项目状态机: idle → understanding → planning → generating → reviewing → publish_ready → published
export type ProjectStatus =
  | "idle"
  | "understanding"
  | "planning"
  | "generating"
  | "reviewing"
  | "publish_ready"
  | "published"

export type TaskStatus = "pending" | "running" | "done"

export type TaskType =
  | "understand"
  | "audience"
  | "design"
  | "visuals"
  | "brief"
  | "research"
  | "campaign-foundation"
  | "visual-system"
  | "campaign"
  | "validation"

// ---- Artifact 流水线 ----
// 预设顺序: brief → research → campaign-foundation → visual-system → campaign → validation → release-package
export type ArtifactType =
  | "brief"
  | "research"
  | "campaign-foundation"
  | "visual-system"
  | "campaign"
  | "validation"
  | "release-package"

// locked: 上游未批准,不可生成
// ready: 已解锁,等待 Agent 生成
// generating: Agent 正在生成
// review: 已生成,等待用户确认
// approved: 用户已批准
// failed: 生成失败,可重试
// stale: 上游被修改,需重新确认
export type ArtifactStatus =
  | "locked"
  | "ready"
  | "generating"
  | "review"
  | "approved"
  | "failed"
  | "stale"

// ---- Artifact 内容结构 ----

export interface BriefContent {
  productName: string
  tagline: string
  audience: string
  painPoints: string[]
  sellingPoints: string[]
  form: string
  retailPrice: number
  earlyBirdPrice: number
  risks: string[]
  heroImage?: string | null
}

export interface ResearchContent {
  summary: string
  marketSize: string
  competitors: { name: string; price: string; note: string }[]
  trends: string[]
  opportunity: string
  sources: { title: string; url: string }[]
}

export type CampaignReadinessStatus = "go" | "conditional_go" | "blocked"
export type CampaignPublicationMode = "demo" | "live"
export type FoundationEvidenceStatus = "available" | "needed" | "launch_required" | "later"
export type FoundationTruthClass =
  | "generated_concept"
  | "cad_render"
  | "prototype_photo"
  | "production_sample"
  | "manufacturing_evidence"
  | "verified_data"

export interface CampaignDirectionScores {
  marketPotential: number
  differentiation: number
  contentPotential: number
  feasibility: number
  crowdfundingFit: number
}

export interface CampaignDirection {
  id: "route-a" | "route-b" | "route-c"
  code: "A" | "B" | "C"
  title: string
  archetype: string
  thesis: string
  targetAudience: string
  purchaseReason: string
  storyAngle: string
  productScope: string[]
  visualDirection: string
  offerStrategy: string
  earlyBirdPrice: number
  campaignPrice: number
  retailPrice: number
  scores: CampaignDirectionScores
  risks: string[]
  recommendation: string
}

export interface FoundationRewardTier {
  id: string
  name: string
  price: number
  contents: string[]
  capacity: number
  estimatedDelivery: string
  shippingNote: string
}

export interface FoundationEvidenceItem {
  id: string
  label: string
  status: FoundationEvidenceStatus
  truthClass: FoundationTruthClass
  notes: string
}

export interface CampaignFoundationContent {
  schemaVersion: 1
  directions: CampaignDirection[]
  selection: {
    selectedDirectionIds: string[]
    instruction: string
    synthesizedAt: string | null
  }
  product: {
    workingName: string
    category: string
    launchVersion: string
    launchFeatures: string[]
    excludedFeatures: string[]
    variants: string[]
  }
  audience: {
    primarySegment: string
    coreSituation: string
    currentAlternative: string
    purchaseMotivation: string
  }
  story: {
    type: string
    thesis: string
  }
  offer: {
    currency: "CNY" | "USD"
    earlyBirdPrice: number
    campaignPrice: number
    retailPrice: number
    rewardTiers: FoundationRewardTier[]
  }
  evidence: {
    items: FoundationEvidenceItem[]
  }
  delivery: {
    productStage: "concept" | "appearance_prototype" | "functional_prototype" | "production_sample"
    supplierStatus: "unknown" | "shortlisted" | "confirmed"
    costRange: string
    moq: string
    certification: string
    productionLeadTime: string
    fulfillmentPlan: string
  }
  visualDirection: {
    mood: string
    palette: string[]
    avoid: string[]
  }
  readiness: {
    status: CampaignReadinessStatus
    publicationMode: CampaignPublicationMode
    score: number
    blockers: string[]
    nextActions: string[]
  }
  openRisks: string[]
}

export interface VisualItem {
  key: string
  label: string
  src: string
  alt: string
  evidenceId?: string
  truthClass?: FoundationTruthClass
  provenance?: string
}

export interface VisualSystemContent {
  style: string
  palette: { name: string; hex: string }[]
  keywords: string[]
  items: VisualItem[]
}

// 兼容旧数据的视觉资产结构(迁移用)
export interface VisualsContent {
  style: string
  items: VisualItem[]
}

export interface CampaignTier {
  id?: string
  name: string
  price: number
  description: string
  limit: number
  estimatedDelivery?: string
  shippingNote?: string
}

export interface CampaignContent {
  currency?: "CNY" | "USD"
  heroTitle: string
  heroSubtitle: string
  problem: string
  solution: string
  features: { title: string; description: string }[]
  specs: { label: string; value: string }[]
  tiers: CampaignTier[]
  timeline: { date: string; event: string }[]
  faq: { q: string; a: string }[]
  goalAmount: number
}

export interface ValidationContent {
  methods: { key: string; label: string; enabled: boolean }[]
  launchPlan: { date: string; event: string }[]
  checklist: string[]
}

export interface ReleaseSource {
  artifactId: string
  type: ArtifactType
  version: number
}

export interface ReleasePackageContent {
  executiveSummary: string
  positioning: string
  marketConclusion: string
  foundationDecision: string
  readinessStatus: CampaignReadinessStatus
  publicationMode: CampaignPublicationMode
  visualGuideline: string
  launchChecklist: string[]
  sources: ReleaseSource[]
}

export interface CampaignEvidenceRecord {
  id: string
  projectId: string
  requirementId: string
  label: string
  role: string
  mediaType: string
  url: string
  truthClass: FoundationTruthClass
  provenance: string
  status: "pending" | "approved" | "rejected"
  notes: string
  createdAt: string | Date
  approvedAt: string | Date | null
}

export interface CampaignClaimRecord {
  id: string
  projectId: string
  text: string
  status: "assumption" | "target" | "tested" | "verified"
  scope: string
  evidenceIds: string[]
  createdAt: string | Date
  updatedAt: string | Date
}

export interface PublicationSnapshotPackage {
  schemaVersion: 1
  project: { id: string; name: string; slug: string }
  brief: BriefContent
  foundation: CampaignFoundationContent
  visuals: VisualSystemContent
  campaign: CampaignContent
  releasePackage: ReleasePackageContent
  evidence: CampaignEvidenceRecord[]
  claims: CampaignClaimRecord[]
  publishedAt: string
}

export type ArtifactContent =
  | BriefContent
  | ResearchContent
  | CampaignFoundationContent
  | VisualSystemContent
  | VisualsContent
  | CampaignContent
  | ValidationContent
  | ReleasePackageContent

// ---- 统一工作台领域模型 ----

export interface StudioProject {
  id: string
  name: string
  slug?: string
  status: ProjectStatus
  initialPrompt?: string
  styleDirection?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface StudioTask {
  id: string
  projectId: string
  type: TaskType
  title: string
  status: TaskStatus
  progress: number
  sortOrder: number
  agentNote: string
  startedAt: string | Date | null
  completedAt: string | Date | null
}

export interface ArtifactMeta {
  feedback?: string
  staleReason?: string
  error?: string
  sources?: ReleaseSource[]
}

export interface StudioArtifact {
  id: string
  projectId: string
  type: ArtifactType
  title: string
  status: ArtifactStatus
  currentRevisionId: string | null
  sortOrder: number
  sequence?: number
  approvedAt?: string | Date | null
  meta?: ArtifactMeta
  createdAt: string | Date
}

export interface StudioArtifactRevision {
  id: string
  artifactId: string
  version: number
  content: ArtifactContent
  prompt: string
  createdAt?: string | Date
}

export interface StudioSignal {
  id: string
  projectId: string
  type: string
  value: string
  createdAt?: string | Date
}

export interface StudioProjectState {
  project: StudioProject
  tasks: StudioTask[]
  artifacts: StudioArtifact[]
  revisions: StudioArtifactRevision[]
  signals: StudioSignal[]
  publication?: { id: string; version: number; mode: string; status: string; publishedAt: string | Date } | null
}

// ---- 任务计划 ----

export interface TaskPlanItem {
  type: TaskType
  title: string
  agentNote: string
  durationMs: number
}
