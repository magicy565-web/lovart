import assert from "node:assert/strict"

import {
  buildCampaignFoundation,
  synthesizeCampaignFoundation,
  withEvaluatedReadiness,
} from "../lib/studio/campaign-foundation.ts"
import {
  buildConceptReleasePackage,
  evaluatePublicationReadiness,
  materializeConceptPublicationContent,
} from "../lib/studio/concept-validation.ts"

const brief = {
  productName: "FocusDock",
  tagline: "Enter focus faster",
  audience: "remote creative workers",
  painPoints: ["It takes too long to enter focused work"],
  sellingPoints: ["ambient lighting", "focus sound", "mobile control"],
  form: "desktop focus device",
  retailPrice: 699,
  earlyBirdPrice: 499,
  risks: ["final manufacturing cost"],
}

const research = {
  summary: "A fragmented market with room for an integrated device.",
  marketSize: "early category",
  competitors: [{ name: "Alternative A", price: "$99", note: "single-purpose" }],
  trends: ["focus rituals"],
  opportunity: "Combine an understandable utility hook with a distinct product ritual.",
  sources: [],
}

const foundation = synthesizeCampaignFoundation(
  buildCampaignFoundation(brief, research),
  ["route-a"],
  "Ship a focused first version.",
)

// Incomplete: foundation not approved yet
{
  const gate = evaluatePublicationReadiness({
    artifacts: [
      { type: "brief", status: "approved" },
      { type: "research", status: "approved" },
      { type: "campaign-foundation", status: "review" },
    ],
    foundation,
  })
  assert.equal(gate.canPublish, false)
  assert.equal(gate.path, "incomplete")
  assert.ok(gate.missingApproved.includes("campaign-foundation"))
}

// Concept path: first three stages approved
{
  const gate = evaluatePublicationReadiness({
    artifacts: [
      { type: "brief", status: "approved" },
      { type: "research", status: "approved" },
      { type: "campaign-foundation", status: "approved" },
      { type: "visual-system", status: "locked" },
      { type: "campaign", status: "locked" },
      { type: "validation", status: "locked" },
      { type: "release-package", status: "locked" },
    ],
    foundation,
    releaseApproved: false,
  })
  assert.equal(gate.canPublish, true)
  assert.equal(gate.path, "concept")
  assert.equal(gate.publicationMode, "demo")
  assert.ok(gate.missingApproved.includes("visual-system"))
}

// Blocked foundation cannot publish even if stages are approved
{
  const blocked = withEvaluatedReadiness({
    ...foundation,
    product: { ...foundation.product, workingName: "", launchFeatures: [] },
    selection: { ...foundation.selection, selectedDirectionIds: [] },
  })
  const gate = evaluatePublicationReadiness({
    artifacts: [
      { type: "brief", status: "approved" },
      { type: "research", status: "approved" },
      { type: "campaign-foundation", status: "approved" },
    ],
    foundation: blocked,
  })
  assert.equal(gate.canPublish, false)
  assert.equal(gate.path, "blocked")
  assert.ok(gate.blockers.length > 0)
}

// Live path requires full pipeline + release + go readiness
{
  const launchReady = withEvaluatedReadiness({
    ...foundation,
    delivery: {
      ...foundation.delivery,
      productStage: "functional_prototype",
      supplierStatus: "confirmed",
      costRange: "30-35 USD",
    },
    evidence: {
      items: foundation.evidence.items.map((item) => ({ ...item, status: "available" })),
    },
  })
  assert.equal(launchReady.readiness.status, "go")

  const incompleteLive = evaluatePublicationReadiness({
    artifacts: [
      { type: "brief", status: "approved" },
      { type: "research", status: "approved" },
      { type: "campaign-foundation", status: "approved" },
    ],
    foundation: launchReady,
    releaseApproved: false,
  })
  // Still concept-publishable (demo), not live — missing downstream stages
  assert.equal(incompleteLive.canPublish, true)
  assert.equal(incompleteLive.path, "concept")
  assert.equal(incompleteLive.publicationMode, "demo")

  const live = evaluatePublicationReadiness({
    artifacts: [
      { type: "brief", status: "approved" },
      { type: "research", status: "approved" },
      { type: "campaign-foundation", status: "approved" },
      { type: "visual-system", status: "approved" },
      { type: "campaign", status: "approved" },
      { type: "validation", status: "approved" },
      { type: "release-package", status: "approved" },
    ],
    foundation: launchReady,
    releaseApproved: true,
  })
  assert.equal(live.canPublish, true)
  assert.equal(live.path, "live")
  assert.equal(live.publicationMode, "live")
}

// Materializers produce demo-safe campaign + release package
{
  const { campaign, visuals } = materializeConceptPublicationContent({ brief, foundation })
  assert.equal(campaign.heroTitle, foundation.product.workingName)
  assert.ok(campaign.tiers.length >= 1)
  assert.ok(visuals.style)

  const release = buildConceptReleasePackage({
    projectName: "FocusDock",
    brief,
    research,
    foundation,
    visualSystem: visuals,
    sources: [{ artifactId: "a", type: "brief", version: 1 }],
  })
  assert.equal(release.publicationMode, "demo")
  assert.equal(release.readinessStatus, foundation.readiness.status)
  assert.match(release.executiveSummary, /概念验证/)
}

console.log("Concept validation publication checks passed")
