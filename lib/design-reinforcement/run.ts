import { createHash } from "node:crypto"

import type {
  DesignReinforcementArtifact,
  DesignReinforcementInput,
} from "@/lib/artifacts/design-reinforcement-artifact"
import { assertConfirmedProductBrief } from "@/lib/design-reinforcement/brief-gate"
import { synthesizeDesignDirections } from "@/lib/design-reinforcement/direction-synthesizer"
import {
  cleanCreativeEvidence,
  evidenceSignalGaps,
} from "@/lib/design-reinforcement/evidence"
import { extractVisualFeatures } from "@/lib/design-reinforcement/feature-extractor"
import { synthesizePatternLibrary } from "@/lib/design-reinforcement/pattern-synthesizer"

export type DesignReinforcementStage =
  | "NORMALIZE_INPUT"
  | "LOAD_RESEARCH_EVIDENCE"
  | "CLEAN_AND_CLUSTER"
  | "EXTRACT_VISUAL_FEATURES"
  | "BUILD_PATTERN_LIBRARY"
  | "SYNTHESIZE_VISUAL_DNA"
  | "CREATE_DESIGN_DIRECTIONS"
  | "FINALIZE"

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`
}

function distinctCompetitors(input: DesignReinforcementInput) {
  return new Set(input.creative_evidence.evidence.map((item) => item.competitor_name.trim().toLowerCase())).size
}

export async function runDesignReinforcement(
  input: DesignReinforcementInput,
  options?: {
    budget?: { maxUsd: number; estimatedActorUsd: number }
    onStage?: (stage: DesignReinforcementStage) => void | Promise<void>
  },
): Promise<DesignReinforcementArtifact> {
  const stage = async (value: DesignReinforcementStage) => options?.onStage?.(value)
  await stage("NORMALIZE_INPUT")
  assertConfirmedProductBrief(input.product_brief)
  if (input.creative_evidence.platform !== "tiktok") throw new Error("V1 只接受 TikTok 创意证据")
  if (distinctCompetitors(input) < 3) throw new Error("设计强化至少需要 3 个不同 TikTok 竞品")
  if (!input.target_assets.length) throw new Error("设计强化至少需要一个目标资产类型")

  await stage("LOAD_RESEARCH_EVIDENCE")
  await stage("CLEAN_AND_CLUSTER")
  const cleaned = cleanCreativeEvidence(input.creative_evidence)
  const acceptedCompetitors = new Set(cleaned.accepted.map((item) => item.competitor_name.trim().toLowerCase())).size
  if (cleaned.accepted.length < 3 || acceptedCompetitors < 3) {
    throw new Error("清洗后不足 3 个不同竞品，不能生成可靠的跨竞品视觉规律")
  }

  await stage("EXTRACT_VISUAL_FEATURES")
  const observations = await extractVisualFeatures({
    evidence: cleaned.accepted,
    productBrief: input.product_brief,
    targetAssets: input.target_assets,
  })

  await stage("BUILD_PATTERN_LIBRARY")
  const synthesis = await synthesizePatternLibrary({
    evidence: cleaned.accepted,
    observations,
    productBrief: input.product_brief,
    targetAssets: input.target_assets,
  })
  await stage("SYNTHESIZE_VISUAL_DNA")

  await stage("CREATE_DESIGN_DIRECTIONS")
  const directions = await synthesizeDesignDirections({
    evidence: cleaned.accepted,
    patterns: synthesis.patternLibrary,
    visualDna: synthesis.visualDna,
    productBrief: input.product_brief,
    targetAssets: input.target_assets,
  })

  await stage("FINALIZE")
  const dominantPatterns = synthesis.patternLibrary.filter((pattern) => ["category_rule", "growth_pattern"].includes(pattern.kind)).slice(0, 6)
  const saturatedPatterns = synthesis.patternLibrary.filter((pattern) => pattern.kind === "saturated_pattern").slice(0, 4)
  const opportunityPatterns = synthesis.patternLibrary.filter((pattern) => pattern.kind === "opportunity_pattern").slice(0, 4)
  const assumptions = [
    "V1 只分析 TikTok 证据，并只编译设计方向，不生成图片、网页或视频。",
    ...(input.constraints?.production_budget ? [`执行可行性按 ${input.constraints.production_budget} 制作预算评估。`] : []),
  ]
  const warnings = [...new Set(input.creative_evidence.warnings)]
  return {
    version: 1,
    stage: "directions_ready",
    artifact_id: stableId("dra", `${input.product_brief.product_id}:v${input.product_brief.version}:${input.product_brief.confirmed_hash}:${input.creative_evidence.bundle_id}:${input.target_assets.join(",")}`),
    product_id: input.product_brief.product_id,
    topic: input.research_artifact.topic,
    created_at: new Date().toISOString(),
    product_brief: input.product_brief,
    research_artifact: input.research_artifact,
    creative_evidence: { ...input.creative_evidence, evidence: cleaned.accepted },
    evidence_cleaning: {
      accepted_count: cleaned.accepted.length,
      rejected: cleaned.rejected,
      clusters: cleaned.clusters,
    },
    visual_features: observations,
    pattern_library: synthesis.patternLibrary,
    market_visual_summary: {
      dominant_patterns: dominantPatterns,
      saturated_patterns: saturatedPatterns,
      opportunity_patterns: opportunityPatterns,
    },
    visual_dna: synthesis.visualDna,
    design_directions: directions,
    target_assets: input.target_assets,
    evidence_trace: {
      evidence_ids: cleaned.accepted.map((item) => item.evidence_id),
      assumptions,
      unresolved_gaps: evidenceSignalGaps(cleaned.accepted),
    },
    budget: {
      max_usd: options?.budget?.maxUsd ?? 0.03,
      estimated_actor_usd: options?.budget?.estimatedActorUsd ?? 0,
    },
    warnings,
  }
}
