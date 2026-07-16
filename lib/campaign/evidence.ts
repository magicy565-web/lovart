import type { CampaignEvidenceRecord, CampaignFoundationContent } from "@/lib/studio/types"

export function applyEvidenceAvailability(
  content: CampaignFoundationContent,
  evidence: CampaignEvidenceRecord[],
): CampaignFoundationContent {
  const approved = evidence.filter((item) => item.status === "approved")
  return {
    ...content,
    evidence: {
      items: content.evidence.items.map((requirement) => {
        const match = approved.some(
          (item) => item.requirementId === requirement.id && item.truthClass === requirement.truthClass,
        )
        if (match) return { ...requirement, status: "available" as const }
        if (requirement.status === "available") return { ...requirement, status: "launch_required" as const }
        return requirement
      }),
    },
  }
}

export function publicationEvidenceBlockers(
  foundation: CampaignFoundationContent,
  evidence: CampaignEvidenceRecord[],
  claims: Array<{ status: string; evidenceIds: string[]; text: string }>,
  publicationMode: "demo" | "live" = foundation.readiness.publicationMode,
) {
  const blockers: string[] = []
  const approvedIds = new Set(evidence.filter((item) => item.status === "approved").map((item) => item.id))
  if (foundation.readiness.status === "blocked") blockers.push(...foundation.readiness.blockers)
  if (publicationMode === "live") {
    for (const requirement of foundation.evidence.items) {
      if (requirement.status !== "available") blockers.push(`缺少上线证据：${requirement.label}`)
    }
    for (const claim of claims) {
      if (["tested", "verified"].includes(claim.status) && !claim.evidenceIds.some((id) => approvedIds.has(id))) {
        blockers.push(`声明缺少批准证据：${claim.text}`)
      }
    }
  }
  return blockers
}
