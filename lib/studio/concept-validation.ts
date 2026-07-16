import {
  buildCampaignFromFoundation,
  buildVisualSystemFromFoundation,
  withEvaluatedReadiness,
} from "./campaign-foundation"
import { normalizeArtifactType, stageFor } from "./artifact-pipeline"
import type {
  ArtifactType,
  BriefContent,
  CampaignContent,
  CampaignFoundationContent,
  CampaignReadinessStatus,
  ReleasePackageContent,
  ResearchContent,
  StudioArtifact,
  ValidationContent,
  VisualSystemContent,
} from "./types"

/** Stages that must be approved before a concept-validation page can ship. */
export const CONCEPT_REQUIRED_TYPES = ["brief", "research", "campaign-foundation"] as const satisfies readonly ArtifactType[]

/** Stages required for a full live release package (everything before release-package). */
export const LIVE_PIPELINE_TYPES = [
  "brief",
  "research",
  "campaign-foundation",
  "visual-system",
  "campaign",
  "validation",
] as const satisfies readonly ArtifactType[]

export type PublicationPath = "concept" | "live" | "blocked" | "incomplete"

export interface PublicationReadiness {
  path: PublicationPath
  canPublish: boolean
  missingApproved: ArtifactType[]
  readinessStatus: CampaignReadinessStatus | null
  publicationMode: "demo" | "live" | null
  blockers: string[]
  summary: string
}

function approvedTypeSet(artifacts: Pick<StudioArtifact, "type" | "status">[]) {
  return new Set(
    artifacts
      .filter((artifact) => artifact.status === "approved")
      .map((artifact) => normalizeArtifactType(artifact.type)),
  )
}

function missingFrom(
  required: readonly ArtifactType[],
  approved: Set<string>,
): ArtifactType[] {
  return required.filter((type) => !approved.has(type))
}

/**
 * Pure gate for "can this project ship a public validation page right now?"
 * Concept path: Brief + Research + locked Foundation (not blocked).
 * Live path: full 1-6 pipeline + release package approved + readiness go.
 *
 * Does not re-parse Foundation through Zod — callers that load untrusted DB JSON
 * should parse at the service boundary before invoking this gate.
 */
export function evaluatePublicationReadiness(input: {
  artifacts: Pick<StudioArtifact, "type" | "status">[]
  foundation: CampaignFoundationContent | null | undefined
  releaseApproved?: boolean
}): PublicationReadiness {
  const approved = approvedTypeSet(input.artifacts)
  const foundation = input.foundation ? withEvaluatedReadiness(input.foundation) : null

  if (!foundation) {
    const missing = missingFrom(CONCEPT_REQUIRED_TYPES, approved)
    return {
      path: "incomplete",
      canPublish: false,
      missingApproved: missing,
      readinessStatus: null,
      publicationMode: null,
      blockers: ["尚未生成或批准 Campaign Foundation"],
      summary: "先完成 Brief、研究与产品定案，才能发布概念验证页。",
    }
  }

  const readiness = foundation.readiness
  if (readiness.status === "blocked") {
    return {
      path: "blocked",
      canPublish: false,
      missingApproved: missingFrom(CONCEPT_REQUIRED_TYPES, approved),
      readinessStatus: readiness.status,
      publicationMode: readiness.publicationMode,
      blockers: readiness.blockers,
      summary: `定案仍被阻塞：${readiness.blockers.join("；")}`,
    }
  }

  const conceptMissing = missingFrom(CONCEPT_REQUIRED_TYPES, approved)
  if (conceptMissing.length) {
    return {
      path: "incomplete",
      canPublish: false,
      missingApproved: conceptMissing,
      readinessStatus: readiness.status,
      publicationMode: readiness.publicationMode,
      blockers: conceptMissing.map((type) => `尚未批准${stageFor(type)?.title ?? type}`),
      summary: "概念验证发布还需批准 Brief、市场研究与 Campaign Foundation。",
    }
  }

  const liveMissing = missingFrom(LIVE_PIPELINE_TYPES, approved)
  const releaseApproved = input.releaseApproved ?? approved.has("release-package")
  const isLiveCandidate = readiness.status === "go" && readiness.publicationMode === "live"

  if (isLiveCandidate && liveMissing.length === 0 && releaseApproved) {
    return {
      path: "live",
      canPublish: true,
      missingApproved: [],
      readinessStatus: readiness.status,
      publicationMode: "live",
      blockers: [],
      summary: "已满足正式发布门禁，可发布完整验证页。",
    }
  }

  return {
    path: "concept",
    canPublish: true,
    missingApproved: liveMissing,
    readinessStatus: readiness.status,
    publicationMode: "demo",
    blockers: [],
    summary:
      liveMissing.length || !releaseApproved
        ? "定案已锁定，可先发布概念验证页收集意向；完整发布包可稍后补齐。"
        : "可发布概念验证页。",
  }
}

export function buildConceptReleasePackage(input: {
  projectName: string
  brief: BriefContent
  research?: ResearchContent | null
  foundation: CampaignFoundationContent
  visualSystem: VisualSystemContent
  validation?: ValidationContent | null
  sources: ReleasePackageContent["sources"]
}): ReleasePackageContent {
  const foundation = withEvaluatedReadiness(input.foundation)
  return {
    executiveSummary: `${input.projectName} 已完成产品定案，当前以概念验证页收集非绑定意向，不收取费用。`,
    positioning: `${input.brief.tagline}，面向${input.brief.audience}。`,
    marketConclusion: input.research?.opportunity ?? foundation.story.thesis,
    foundationDecision: `${foundation.product.launchVersion}；${foundation.story.thesis}`,
    readinessStatus: foundation.readiness.status,
    publicationMode: "demo",
    visualGuideline: `${input.visualSystem.style}；核心关键词：${input.visualSystem.keywords.join("、") || "待补充"}。`,
    launchChecklist: input.validation?.checklist ?? [
      "Campaign Foundation 已批准",
      "公开页标明概念验证、不收费",
      "证据等级与 nextActions 对用户可见",
    ],
    sources: input.sources,
  }
}

/** Materialize campaign + visual content for a concept publish when downstream stages are not done yet. */
export function materializeConceptPublicationContent(input: {
  brief: BriefContent
  foundation: CampaignFoundationContent
  campaign?: CampaignContent | null
  visuals?: VisualSystemContent | null
}) {
  const foundation = withEvaluatedReadiness(input.foundation)
  const campaign = input.campaign ?? buildCampaignFromFoundation(foundation, input.brief)
  const visuals = input.visuals ?? buildVisualSystemFromFoundation(foundation)
  return { foundation, campaign, visuals }
}
