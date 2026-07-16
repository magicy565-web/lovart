import { createHash } from "node:crypto"

import { researchTikTokShopCompetitors } from "@/lib/apify/tiktok-shop-research"
import type {
  ConfirmedProductBriefInput,
  DesignTargetAsset,
  ResearchArtifactInput,
} from "@/lib/artifacts/design-reinforcement-artifact"
import { buildCompetitiveCreativeBundle } from "@/lib/design-reinforcement/evidence"
import { runDesignReinforcement } from "@/lib/design-reinforcement/run"

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`
}

export async function collectAndCompileTikTokDesignEvidence({
  productBrief,
  researchArtifact,
  targetAssets,
}: {
  productBrief: ConfirmedProductBriefInput
  researchArtifact: Omit<ResearchArtifactInput, "created_at">
  targetAssets: DesignTargetAsset[]
}) {
  const research = await researchTikTokShopCompetitors(researchArtifact.query)
  const creativeEvidence = buildCompetitiveCreativeBundle(research, researchArtifact.query)
  const normalizedResearch: ResearchArtifactInput = {
    ...researchArtifact,
    research_id: researchArtifact.research_id || stableId(
      "research",
      `${research.collection.actorRunId}:${researchArtifact.query}:${researchArtifact.design_goal}`,
    ),
    created_at: research.collection.collectedAt,
  }
  return runDesignReinforcement(
    {
      product_brief: productBrief,
      research_artifact: normalizedResearch,
      creative_evidence: creativeEvidence,
      target_assets: targetAssets,
      constraints: {
        markets: ["US"],
        platforms: ["tiktok"],
        brand_maturity: "new",
        production_budget: "low",
      },
    },
    { budget: research.budget },
  )
}
