import assert from "node:assert/strict"

import {
  buildCampaignFoundation,
  synthesizeCampaignFoundation,
  withEvaluatedReadiness,
} from "../lib/studio/campaign-foundation.ts"

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

const base = buildCampaignFoundation(brief, research)
assert.equal(base.readiness.status, "conditional_go")
assert.equal(base.readiness.publicationMode, "demo")

const synthesized = synthesizeCampaignFoundation(
  base,
  ["route-a", "route-b"],
  "Keep route A utility, use route B visual language, campaign price 79 USD max.",
)
assert.deepEqual(synthesized.selection.selectedDirectionIds, ["route-a", "route-b"])
assert.equal(synthesized.offer.currency, "USD")
assert.equal(synthesized.offer.earlyBirdPrice, 67)
assert.equal(synthesized.offer.campaignPrice, 79)
assert.equal(synthesized.offer.retailPrice, 99)
assert.deepEqual(synthesized.offer.rewardTiers.map((tier) => tier.price), [67, 79, 99])

const launchReady = withEvaluatedReadiness({
  ...synthesized,
  delivery: {
    ...synthesized.delivery,
    productStage: "functional_prototype",
    supplierStatus: "confirmed",
    costRange: "30-35 USD",
  },
  evidence: {
    items: synthesized.evidence.items.map((item) => ({ ...item, status: "available" })),
  },
})
assert.equal(launchReady.readiness.status, "go")
assert.equal(launchReady.readiness.publicationMode, "live")

// Concept path remains available when only foundation is ready.
const conceptOnly = withEvaluatedReadiness({
  ...synthesized,
  delivery: {
    ...synthesized.delivery,
    productStage: "concept",
    supplierStatus: "unknown",
  },
})
assert.equal(conceptOnly.readiness.publicationMode, "demo")

console.log("Campaign foundation checks passed")
