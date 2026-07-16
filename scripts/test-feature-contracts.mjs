import assert from "node:assert/strict"

import {
  claimNeedSchema,
  collaborationRequestSchema,
  commentSchema,
  createNeedSchema,
  exploreProjectIdSchema,
  exploreQuerySchema,
  forkProjectSchema,
  shareProjectSchema,
} from "../features/explore/contracts.ts"
import {
  campaignEmailSchema,
  campaignSlugSchema,
  campaignTierSchema,
} from "../features/campaign/contracts.ts"

assert.deepEqual(exploreQuerySchema.parse({}), {
  view: "feed",
  status: "all",
  sort: "latest",
  collaboration: "all",
  limit: 24,
  offset: 0,
})
assert.equal(exploreQuerySchema.parse({ limit: 48, offset: 12 }).limit, 48)
assert.equal(exploreQuerySchema.parse({ sort: "active", view: "activity" }).view, "activity")
assert.equal(exploreProjectIdSchema.safeParse("not-a-project-id").success, false)
assert.equal(
  shareProjectSchema.safeParse({
    projectId: crypto.randomUUID(),
    category: "产品",
    coverImage: "/images/demo.png",
  }).success,
  true,
)
assert.equal(exploreQuerySchema.safeParse({ limit: 49 }).success, false)

const forkOk = forkProjectSchema.safeParse({
  projectId: crypto.randomUUID(),
  title: "Nomad Coffee Kit Office Fork",
  scope: "full_project",
  mode: "continue",
})
assert.equal(forkOk.success, true)

assert.equal(
  collaborationRequestSchema.safeParse({
    projectId: crypto.randomUUID(),
    message: "want to join packaging",
  }).success,
  true,
)

assert.equal(
  claimNeedSchema.safeParse({
    projectId: crypto.randomUUID(),
    needId: crypto.randomUUID(),
  }).success,
  true,
)

assert.equal(
  createNeedSchema.safeParse({
    projectId: crypto.randomUUID(),
    title: "find silicone supplier",
    type: "supplier",
  }).success,
  true,
)

assert.equal(
  commentSchema.safeParse({
    projectId: crypto.randomUUID(),
    body: "interesting price band",
  }).success,
  true,
)

assert.equal(campaignEmailSchema.parse("  User@Example.COM "), "user@example.com")
assert.equal(campaignEmailSchema.safeParse("invalid-email").success, false)
assert.equal(campaignSlugSchema.safeParse("").success, false)
assert.equal(campaignTierSchema.safeParse("A".repeat(121)).success, false)

console.log("Feature contract checks passed.")
