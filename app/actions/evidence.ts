"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import * as evidence from "@/features/campaign/server/evidence-service"

const uuid = z.string().uuid()
const truthClass = z.enum(["generated_concept", "cad_render", "prototype_photo", "production_sample", "manufacturing_evidence", "verified_data"])
const claimStatus = z.enum(["assumption", "target", "tested", "verified"])

export async function getCampaignEvidenceState(projectId: string) {
  return evidence.getCampaignEvidenceState(uuid.parse(projectId))
}

export async function addCampaignEvidenceLink(projectId: string, input: {
  requirementId: string; label: string; role: string; url: string; truthClass: string; provenance: string; notes: string
}) {
  return evidence.addCampaignEvidenceLink(uuid.parse(projectId), {
    requirementId: z.string().trim().min(1).max(120).parse(input.requirementId),
    label: z.string().trim().min(1).max(200).parse(input.label),
    role: z.string().trim().min(1).max(80).parse(input.role),
    url: z.string().url().max(2_000).parse(input.url),
    truthClass: truthClass.parse(input.truthClass),
    provenance: z.string().trim().max(1_000).parse(input.provenance),
    notes: z.string().trim().max(1_000).parse(input.notes),
  })
}

export async function registerGeneratedConceptAsset(projectId: string, input: { url: string; label: string; provenance: string }) {
  return evidence.registerGeneratedConceptAsset(uuid.parse(projectId), {
    url: z.string().url().max(4_000).parse(input.url),
    label: z.string().trim().min(1).max(200).parse(input.label),
    provenance: z.string().trim().max(2_000).parse(input.provenance),
  })
}

export async function approveCampaignEvidence(projectId: string, evidenceId: string) {
  const result = await evidence.approveCampaignEvidence(uuid.parse(projectId), uuid.parse(evidenceId))
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function rejectCampaignEvidence(projectId: string, evidenceId: string) {
  const result = await evidence.rejectCampaignEvidence(uuid.parse(projectId), uuid.parse(evidenceId))
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function createCampaignClaim(projectId: string, input: { text: string; status: string; scope: string; evidenceIds: string[] }) {
  return evidence.createCampaignClaim(uuid.parse(projectId), {
    text: z.string().trim().min(1).max(500).parse(input.text),
    status: claimStatus.parse(input.status),
    scope: z.string().trim().min(1).max(80).parse(input.scope),
    evidenceIds: z.array(uuid).max(30).parse(input.evidenceIds),
  })
}

export async function deleteCampaignClaim(projectId: string, claimId: string) {
  return evidence.deleteCampaignClaim(uuid.parse(projectId), uuid.parse(claimId))
}
