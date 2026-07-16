import "server-only"

import { db } from "@/lib/db"
import { campaignClaims, campaignEvidence, projects } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

import { applyEvidenceAvailability } from "@/lib/campaign/evidence"
import { parseCampaignFoundation, withEvaluatedReadiness } from "@/lib/studio/campaign-foundation"
import type { CampaignClaimRecord, CampaignEvidenceRecord, FoundationTruthClass } from "@/lib/studio/types"
import { getProjectState, saveCampaignFoundation } from "@/features/studio/server/service"

function evidenceRecord(row: typeof campaignEvidence.$inferSelect): CampaignEvidenceRecord {
  return { ...row, truthClass: row.truthClass as FoundationTruthClass, status: row.status as CampaignEvidenceRecord["status"] }
}

function claimRecord(row: typeof campaignClaims.$inferSelect): CampaignClaimRecord {
  return { ...row, status: row.status as CampaignClaimRecord["status"], evidenceIds: row.evidenceIds as string[] }
}

export async function getCampaignEvidenceState(projectId: string) {
  const [evidenceRows, claimRows] = await Promise.all([
    db.select().from(campaignEvidence).where(eq(campaignEvidence.projectId, projectId)).orderBy(desc(campaignEvidence.createdAt)),
    db.select().from(campaignClaims).where(eq(campaignClaims.projectId, projectId)).orderBy(desc(campaignClaims.createdAt)),
  ])
  return { evidence: evidenceRows.map(evidenceRecord), claims: claimRows.map(claimRecord) }
}

async function refreshFoundation(projectId: string) {
  const state = await getProjectState(projectId)
  const artifact = state?.artifacts.find((item) => item.type === "campaign-foundation")
  const content = state?.revisions.find((item) => item.id === artifact?.currentRevisionId)?.content
  if (!content) return null
  const evidence = (await getCampaignEvidenceState(projectId)).evidence
  const synchronized = withEvaluatedReadiness(applyEvidenceAvailability(parseCampaignFoundation(content), evidence))
  return saveCampaignFoundation(projectId, synchronized)
}

export async function addCampaignEvidenceLink(projectId: string, input: {
  requirementId: string
  label: string
  role: string
  url: string
  truthClass: FoundationTruthClass
  provenance: string
  notes: string
}) {
  const [row] = await db.insert(campaignEvidence).values({
    projectId,
    requirementId: input.requirementId,
    label: input.label,
    role: input.role,
    mediaType: "link",
    url: input.url,
    truthClass: input.truthClass,
    provenance: input.provenance,
    notes: input.notes,
    status: "pending",
  }).returning()
  return evidenceRecord(row)
}

export async function registerUploadedCampaignEvidence(projectId: string, input: {
  requirementId: string
  label: string
  role: string
  mediaType: string
  url: string
  truthClass: FoundationTruthClass
  provenance: string
  notes: string
}) {
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId))
  if (!project) throw new Error("项目不存在")
  const [row] = await db.insert(campaignEvidence).values({
    projectId,
    ...input,
    status: "pending",
  }).returning()
  return evidenceRecord(row)
}

export async function registerGeneratedConceptAsset(projectId: string, input: { url: string; label: string; provenance: string }) {
  const existing = await db.select({ id: campaignEvidence.id }).from(campaignEvidence).where(and(eq(campaignEvidence.projectId, projectId), eq(campaignEvidence.url, input.url)))
  if (existing.length) return existing[0]
  const heroCount = await db.select({ id: campaignEvidence.id }).from(campaignEvidence).where(and(eq(campaignEvidence.projectId, projectId), eq(campaignEvidence.role, "hero_product")))
  const [row] = await db.insert(campaignEvidence).values({
    projectId,
    requirementId: "concept",
    label: input.label,
    role: heroCount.length ? "concept_visual" : "hero_product",
    mediaType: "image",
    url: input.url,
    truthClass: "generated_concept",
    provenance: input.provenance,
    notes: "由图像生成工具创建，仅证明外观与场景方向。",
    status: "approved",
    approvedAt: new Date(),
  }).returning()
  await refreshFoundation(projectId)
  return evidenceRecord(row)
}

export async function approveCampaignEvidence(projectId: string, evidenceId: string) {
  const [row] = await db.update(campaignEvidence).set({ status: "approved", approvedAt: new Date() }).where(and(eq(campaignEvidence.id, evidenceId), eq(campaignEvidence.projectId, projectId))).returning()
  if (!row) throw new Error("证据不存在")
  const foundation = await refreshFoundation(projectId)
  return { evidence: evidenceRecord(row), foundation: foundation?.content ?? null }
}

export async function rejectCampaignEvidence(projectId: string, evidenceId: string) {
  const [row] = await db.update(campaignEvidence).set({ status: "rejected", approvedAt: null }).where(and(eq(campaignEvidence.id, evidenceId), eq(campaignEvidence.projectId, projectId))).returning()
  if (!row) throw new Error("证据不存在")
  const foundation = await refreshFoundation(projectId)
  return { evidence: evidenceRecord(row), foundation: foundation?.content ?? null }
}

export async function createCampaignClaim(projectId: string, input: { text: string; status: CampaignClaimRecord["status"]; scope: string; evidenceIds: string[] }) {
  const [row] = await db.insert(campaignClaims).values({ projectId, text: input.text, status: input.status, scope: input.scope, evidenceIds: input.evidenceIds }).returning()
  return claimRecord(row)
}

export async function deleteCampaignClaim(projectId: string, claimId: string) {
  await db.delete(campaignClaims).where(and(eq(campaignClaims.id, claimId), eq(campaignClaims.projectId, projectId)))
  return { ok: true }
}
