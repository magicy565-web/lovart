import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
if (existsSync(resolve(root, ".env.local")) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(resolve(root, ".env.local"))
}
process.env.NODE_ENV = "test"

const [studio, campaignService, foundationModule, evidenceModule, database, schema, drizzle] = await Promise.all([
  import("../features/studio/server/service.ts"),
  import("../features/campaign/server/service.ts"),
  import("../lib/studio/campaign-foundation.ts"),
  import("../lib/campaign/evidence.ts"),
  import("../lib/db/index.ts"),
  import("../lib/db/schema.ts"),
  import("drizzle-orm"),
])

const { db, pool } = database
const {
  campaignRateLimits,
  campaignReservations,
  projects,
  publicationSnapshots,
} = schema
const { and, asc, eq } = drizzle
const createdProjects = []
const rateLimitHashes = []

const brief = {
  productName: "LaunchLock Test Product",
  tagline: "A bounded promise for a real launch test",
  audience: "early product supporters",
  painPoints: ["Launch claims can drift away from evidence"],
  sellingPoints: ["immutable publication", "evidence-bound claims", "capacity-safe reservation"],
  form: "test physical product",
  retailPrice: 129,
  earlyBirdPrice: 79,
  risks: ["manufacturing proof is not yet available"],
}

const research = {
  summary: "Test-only market summary.",
  marketSize: "unverified test fixture",
  competitors: [],
  trends: ["evidence-led launches"],
  opportunity: "Test publication and reservation contracts without fabricating proof.",
  sources: [],
}

function hashRateLimitKey(clientKey, email) {
  return createHash("sha256").update(`${clientKey}:${email.trim().toLowerCase()}`).digest("hex")
}

async function artifactFor(projectId, type) {
  const state = await studio.getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.type === type)
  assert.ok(artifact, `missing ${type} artifact`)
  return artifact
}

async function saveAndApprove(projectId, type, content) {
  const artifact = await artifactFor(projectId, type)
  await studio.submitArtifactForReview(projectId, artifact.id, content, `commercialization test: ${type}`)
  await studio.approveArtifact(projectId, artifact.id)
}

async function createPipelineProject(prompt) {
  const created = await studio.createProject(prompt)
  createdProjects.push(created.projectId)
  await saveAndApprove(created.projectId, "brief", brief)
  await saveAndApprove(created.projectId, "research", research)
  return created
}

try {
  const baseFoundation = foundationModule.buildCampaignFoundation(brief, research)
  const requirement = baseFoundation.evidence.items[0]
  assert.ok(requirement, "foundation must define at least one evidence requirement")

  const manuallyAvailable = {
    ...baseFoundation,
    evidence: {
      items: baseFoundation.evidence.items.map((item) =>
        item.id === requirement.id ? { ...item, status: "available" } : item,
      ),
    },
  }
  const pendingEvidence = [{
    id: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    requirementId: requirement.id,
    label: requirement.label,
    role: requirement.role,
    mediaType: "image",
    url: "https://example.com/pending.jpg",
    truthClass: requirement.truthClass,
    provenance: "test fixture",
    status: "pending",
    notes: "",
    createdAt: new Date(),
    approvedAt: null,
  }]
  const pendingResult = evidenceModule.applyEvidenceAvailability(manuallyAvailable, pendingEvidence)
  assert.equal(pendingResult.evidence.items.find((item) => item.id === requirement.id)?.status, "launch_required")
  const approvedResult = evidenceModule.applyEvidenceAvailability(manuallyAvailable, [
    { ...pendingEvidence[0], status: "approved", approvedAt: new Date() },
  ])
  assert.equal(approvedResult.evidence.items.find((item) => item.id === requirement.id)?.status, "available")

  const conceptProject = await createPipelineProject("Commercialization snapshot and reservation contract test")
  const conceptFoundation = foundationModule.withEvaluatedReadiness({
    ...baseFoundation,
    offer: {
      ...baseFoundation.offer,
      rewardTiers: baseFoundation.offer.rewardTiers.map((tier, index) => ({
        ...tier,
        capacity: index === 0 ? 1 : index === 1 ? 2 : tier.capacity,
      })),
    },
  })
  await saveAndApprove(conceptProject.projectId, "campaign-foundation", conceptFoundation)

  const slug = await studio.publishProject(conceptProject.projectId)
  const publishedV1 = await campaignService.getCampaignBySlug(slug)
  assert.equal(publishedV1?.snapshot?.version, 1)
  const v1WorkingName = publishedV1?.foundation?.product.workingName

  const revisedFoundation = foundationModule.withEvaluatedReadiness({
    ...conceptFoundation,
    product: { ...conceptFoundation.product, workingName: `${conceptFoundation.product.workingName} V2` },
  })
  await studio.saveCampaignFoundation(conceptProject.projectId, revisedFoundation)
  await studio.approveArtifact(
    conceptProject.projectId,
    (await artifactFor(conceptProject.projectId, "campaign-foundation")).id,
  )

  const stillV1 = await campaignService.getCampaignBySlug(slug)
  assert.equal(stillV1?.snapshot?.version, 1)
  assert.equal(stillV1?.foundation?.product.workingName, v1WorkingName)

  await studio.publishProject(conceptProject.projectId)
  const publishedV2 = await campaignService.getCampaignBySlug(slug)
  assert.equal(publishedV2?.snapshot?.version, 2)
  assert.equal(publishedV2?.foundation?.product.workingName, revisedFoundation.product.workingName)
  assert.equal(publishedV2?.runtime?.reservationCount, 0)
  assert.equal(publishedV2?.runtime?.reservedValue, 0)
  assert.equal(publishedV2?.operating.creator, null)
  assert.equal(publishedV2?.operating.faqCount, publishedV2?.campaign.faq.length)

  const snapshots = await db
    .select()
    .from(publicationSnapshots)
    .where(eq(publicationSnapshots.projectId, conceptProject.projectId))
    .orderBy(asc(publicationSnapshots.version))
  assert.equal(snapshots.length, 2)
  assert.equal(snapshots[0].status, "removed")
  assert.equal(snapshots[1].status, "active")
  assert.equal(snapshots[0].package.foundation.product.workingName, v1WorkingName)

  assert.ok(publishedV2, "republished campaign must be readable")
  const tiers = publishedV2.campaign.tiers
  assert.ok(tiers.length >= 2, "reservation test requires at least two tiers")
  const [limitedTier, updateTier] = tiers

  const honeypotEmail = "bot@example.test"
  const honeypot = await campaignService.submitEarlyBird(
    conceptProject.projectId,
    honeypotEmail,
    limitedTier.name,
    "filled",
    "honeypot-client",
  )
  assert.equal(honeypot.ok, true)
  const honeypotRows = await db.select().from(campaignReservations).where(and(
    eq(campaignReservations.snapshotId, publishedV2.snapshot.id),
    eq(campaignReservations.email, honeypotEmail),
  ))
  assert.equal(honeypotRows.length, 0)

  const duplicateEmail = "Duplicate@Example.Test"
  assert.equal((await campaignService.submitEarlyBird(
    conceptProject.projectId,
    duplicateEmail,
    limitedTier.name,
    "",
    "duplicate-client-1",
  )).ok, true)
  const updated = await campaignService.submitEarlyBird(
    conceptProject.projectId,
    duplicateEmail.toLowerCase(),
    updateTier.name,
    "",
    "duplicate-client-2",
  )
  assert.equal(updated.ok, true)
  assert.equal(updated.updated, true)
  const duplicateRows = await db.select().from(campaignReservations).where(and(
    eq(campaignReservations.snapshotId, publishedV2.snapshot.id),
    eq(campaignReservations.email, duplicateEmail.toLowerCase()),
  ))
  assert.equal(duplicateRows.length, 1)
  assert.equal(duplicateRows[0].tierName, updateTier.name)

  const runtimeAfterUpdate = await campaignService.getCampaignBySlug(slug)
  assert.equal(runtimeAfterUpdate?.runtime?.reservationCount, 1)
  assert.equal(runtimeAfterUpdate?.runtime?.tierReservationCount, 1)
  assert.equal(runtimeAfterUpdate?.runtime?.reservedValue, updateTier.price)
  assert.equal(
    runtimeAfterUpdate?.runtime?.tierAvailability.find((item) => item.tierName === limitedTier.name)?.remaining,
    1,
  )

  const concurrent = await Promise.all([
    campaignService.submitEarlyBird(
      conceptProject.projectId,
      "capacity-a@example.test",
      limitedTier.name,
      "",
      "capacity-a",
    ),
    campaignService.submitEarlyBird(
      conceptProject.projectId,
      "capacity-b@example.test",
      limitedTier.name,
      "",
      "capacity-b",
    ),
  ])
  assert.equal(concurrent.filter((result) => result.ok).length, 1)
  assert.equal(concurrent.filter((result) => !result.ok && result.error === "该档位已预约满").length, 1)

  const runtimeAtCapacity = await campaignService.getCampaignBySlug(slug)
  assert.equal(runtimeAtCapacity?.runtime?.reservationCount, 2)
  assert.equal(runtimeAtCapacity?.runtime?.tierReservationCount, 2)
  assert.equal(runtimeAtCapacity?.runtime?.reservedValue, updateTier.price + limitedTier.price)
  const limitedAvailability = runtimeAtCapacity?.runtime?.tierAvailability.find(
    (item) => item.tierName === limitedTier.name,
  )
  assert.equal(limitedAvailability?.remaining, 0)
  assert.equal(limitedAvailability?.soldOut, true)

  const rateEmail = "rate-limit@example.test"
  const rateClient = `rate-client-${crypto.randomUUID()}`
  rateLimitHashes.push(hashRateLimitKey(rateClient, rateEmail))
  for (let index = 0; index < 8; index += 1) {
    assert.equal((await campaignService.submitEmail(
      conceptProject.projectId,
      rateEmail,
      "",
      rateClient,
    )).ok, true)
  }
  const rateLimited = await campaignService.submitEmail(
    conceptProject.projectId,
    rateEmail,
    "",
    rateClient,
  )
  assert.equal(rateLimited.ok, false)
  assert.equal(rateLimited.error, "提交过于频繁，请稍后重试")

  await studio.unpublishProject(conceptProject.projectId)
  assert.equal(await campaignService.getCampaignBySlug(slug), null)

  const liveProject = await createPipelineProject("Live publication missing evidence contract test")
  const liveFoundation = foundationModule.withEvaluatedReadiness({
    ...foundationModule.buildCampaignFoundation(brief, research),
    delivery: {
      ...baseFoundation.delivery,
      productStage: "functional_prototype",
      supplierStatus: "confirmed",
      costRange: "30-35 USD",
    },
    evidence: {
      items: baseFoundation.evidence.items.map((item) => ({ ...item, status: "available" })),
    },
  })
  assert.equal(liveFoundation.readiness.status, "go")
  await saveAndApprove(liveProject.projectId, "campaign-foundation", liveFoundation)

  for (const type of ["visual-system", "campaign", "validation"]) {
    const artifact = await artifactFor(liveProject.projectId, type)
    await studio.generateArtifactDraft(liveProject.projectId, artifact.id)
    await studio.approveArtifact(liveProject.projectId, artifact.id)
  }

  await studio.assembleReleasePackage(liveProject.projectId)
  await studio.approveArtifact(
    liveProject.projectId,
    (await artifactFor(liveProject.projectId, "release-package")).id,
  )

  // The normal save path correctly downgrades missing evidence to demo. Simulate
  // a stale live-ready revision so publishProject's final boundary is exercised.
  const liveFoundationArtifact = await artifactFor(liveProject.projectId, "campaign-foundation")
  await studio.saveRevision(liveFoundationArtifact.id, liveFoundation, "simulate stale live-ready revision")

  // Live publish should reject when foundation claims lack approved evidence.
  let livePublishError = null
  try {
    await studio.publishProject(liveProject.projectId)
  } catch (error) {
    livePublishError = error instanceof Error ? error.message : String(error)
  }
  assert.ok(livePublishError, "live publish without complete evidence must throw")
  assert.ok(
    /创建者身份/.test(livePublishError) && /缺少上线证据/.test(livePublishError),
    `unexpected live publish error: ${livePublishError}`,
  )

  // Unit-level blockers for live mode still surface missing evidence labels.
  const blockers = evidenceModule.publicationEvidenceBlockers(
    {
      ...liveFoundation,
      evidence: {
        items: liveFoundation.evidence.items.map((item) => ({ ...item, status: "needed" })),
      },
    },
    [],
    [{ status: "verified", evidenceIds: [], text: "续航 8 小时" }],
    "live",
  )
  assert.ok(blockers.some((item) => item.includes("缺少上线证据")))
  assert.ok(blockers.some((item) => item.includes("声明缺少批准证据")))

  console.log("Campaign commercialization checks passed")
} finally {
  for (const projectId of createdProjects) {
    await db.delete(projects).where(eq(projects.id, projectId))
  }
  for (const keyHash of rateLimitHashes) {
    await db.delete(campaignRateLimits).where(eq(campaignRateLimits.keyHash, keyHash))
  }
  await pool.end()
}
