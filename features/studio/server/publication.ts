import "server-only"

import { db } from "@/lib/db"
import {
  projects,
  validationSignals,
  campaignEvidence,
  campaignClaims,
  publicationSnapshots,
} from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import {
  parseCampaignFoundation,
  withEvaluatedReadiness,
} from "@/lib/studio/campaign-foundation"
import { applyEvidenceAvailability, publicationEvidenceBlockers } from "@/lib/campaign/evidence"
import {
  buildConceptReleasePackage,
  evaluatePublicationReadiness,
  materializeConceptPublicationContent,
} from "@/lib/studio/concept-validation"
import type {
  ArtifactContent,
  ArtifactType,
  BriefContent,
  CampaignFoundationContent,
  CampaignEvidenceRecord,
  CampaignClaimRecord,
  CampaignContent,
  ReleasePackageContent,
  PublicationSnapshotPackage,
  ResearchContent,
  ValidationContent,
  VisualSystemContent,
} from "@/lib/studio/types"
import {
  approveArtifact,
  getProjectState,
  saveCampaignFoundation,
} from "@/features/studio/server/service"

export async function publishProject(projectId: string) {
  const state = await getProjectState(projectId)
  if (!state) throw new Error("项目不存在")

  const contentOf = <T extends ArtifactContent>(type: ArtifactType) => {
    const artifact = state.artifacts.find((item) => item.type === type)
    return state.revisions.find((revision) => revision.id === artifact?.currentRevisionId)?.content as T | undefined
  }

  const brief = contentOf<BriefContent>("brief")
  const research = contentOf<ResearchContent>("research")
  const foundationContent = contentOf<CampaignFoundationContent>("campaign-foundation")
  if (!brief || !foundationContent) throw new Error("发布前至少需要已批准的产品 Brief 与 Campaign Foundation")

  const release = state.artifacts.find((artifact) => artifact.type === "release-package")
  const gate = evaluatePublicationReadiness({
    artifacts: state.artifacts,
    foundation: foundationContent,
    releaseApproved: release?.status === "approved",
  })
  if (!gate.canPublish) {
    throw new Error(gate.blockers[0] ?? gate.summary)
  }

  const [evidenceRows, claimRows] = await Promise.all([
    db.select().from(campaignEvidence).where(eq(campaignEvidence.projectId, projectId)),
    db.select().from(campaignClaims).where(eq(campaignClaims.projectId, projectId)),
  ])
  const evidence = evidenceRows as CampaignEvidenceRecord[]
  const claims = claimRows.map((item) => ({
    ...item,
    status: item.status as CampaignClaimRecord["status"],
    evidenceIds: item.evidenceIds as string[],
  }))

  const foundation = withEvaluatedReadiness(
    applyEvidenceAvailability(parseCampaignFoundation(foundationContent), evidence),
  )

  // Live path keeps the strict evidence gate; concept path only forbids explicit blockers.
  if (gate.path === "live") {
    const blockers = [
      ...(state.project.ownerId ? [] : ["正式发布前需要补齐创建者身份"]),
      ...publicationEvidenceBlockers(foundation, evidence, claims, "live"),
    ]
    if (blockers.length) throw new Error(`项目尚不可发布：${blockers.join("；")}`)
  }

  const existingCampaign = contentOf<CampaignContent>("campaign")
  const existingVisuals = contentOf<VisualSystemContent>("visual-system")
  const existingValidation = contentOf<ValidationContent>("validation")
  const existingRelease = contentOf<ReleasePackageContent>("release-package")

  const { campaign, visuals } = materializeConceptPublicationContent({
    brief,
    foundation,
    campaign: existingCampaign,
    visuals: existingVisuals,
  })

  const sources = (["brief", "research", "campaign-foundation", "visual-system", "campaign", "validation"] as ArtifactType[])
    .map((type) => {
      const artifact = state.artifacts.find((item) => item.type === type)
      if (!artifact?.currentRevisionId || artifact.status !== "approved") return null
      const revision = state.revisions.find((item) => item.id === artifact.currentRevisionId)
      if (!revision) return null
      return { artifactId: artifact.id, type, version: revision.version }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const releasePackage =
    gate.path === "live" && existingRelease
      ? existingRelease
      : buildConceptReleasePackage({
          projectName: state.project.name,
          brief,
          research,
          foundation,
          visualSystem: visuals,
          validation: existingValidation,
          sources,
        })

  // Concept publishes always freeze publicationMode as demo so public pages cannot claim live readiness.
  const publicationMode = gate.path === "live" ? foundation.readiness.publicationMode : "demo"
  const snapshotFoundation =
    publicationMode === "demo"
      ? {
          ...foundation,
          readiness: {
            ...foundation.readiness,
            status: foundation.readiness.status === "go" ? ("conditional_go" as const) : foundation.readiness.status,
            publicationMode: "demo" as const,
          },
        }
      : foundation

  const publishedAt = new Date()
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`publish:${projectId}`}))`)
    // Supersede any active snapshot so only one public version is live.
    await tx
      .update(publicationSnapshots)
      .set({ status: "removed" })
      .where(and(eq(publicationSnapshots.projectId, projectId), eq(publicationSnapshots.status, "active")))
    const [latest] = await tx
      .select({ version: publicationSnapshots.version })
      .from(publicationSnapshots)
      .where(eq(publicationSnapshots.projectId, projectId))
      .orderBy(desc(publicationSnapshots.version))
      .limit(1)
    const version = (latest?.version ?? 0) + 1
    const packageContent: PublicationSnapshotPackage = {
      schemaVersion: 1,
      project: { id: state.project.id, name: state.project.name, slug: state.project.slug ?? "" },
      brief,
      foundation: snapshotFoundation,
      visuals,
      campaign,
      releasePackage,
      evidence,
      claims,
      publishedAt: publishedAt.toISOString(),
    }
    await tx.insert(publicationSnapshots).values({
      projectId,
      slug: state.project.slug ?? "",
      version,
      mode: publicationMode,
      status: "active",
      package: packageContent,
      publishedAt,
    })
    const [project] = await tx
      .update(projects)
      .set({ status: "published", publishedAt, updatedAt: publishedAt })
      .where(eq(projects.id, projectId))
      .returning()
    if (!project) throw new Error("项目不存在")
    return project
  })
  return result.slug
}

export async function approveFoundationAndPublishConcept(
  projectId: string,
  content?: CampaignFoundationContent,
) {
  if (content) {
    await saveCampaignFoundation(projectId, content)
  }

  const state = await getProjectState(projectId)
  if (!state) throw new Error("项目不存在")
  const foundationArtifact = state.artifacts.find((item) => item.type === "campaign-foundation")
  if (!foundationArtifact) throw new Error("Campaign Foundation 节点不存在")

  if (foundationArtifact.status === "review" || foundationArtifact.status === "stale") {
    await approveArtifact(projectId, foundationArtifact.id)
  } else if (foundationArtifact.status !== "approved") {
    throw new Error("请先生成并保存 Campaign Foundation，再发布概念验证页")
  }

  const latest = await getProjectState(projectId)
  if (!latest?.publicationReadiness?.canPublish) {
    throw new Error(latest?.publicationReadiness?.summary ?? "当前尚不可发布概念验证页")
  }

  const slug = await publishProject(projectId)
  const after = await getProjectState(projectId)
  return {
    slug,
    path: after?.publicationReadiness?.path ?? "concept",
    mode: after?.publication?.mode ?? "demo",
    version: after?.publication?.version ?? 1,
    summary: after?.publicationReadiness?.summary ?? "概念验证页已发布",
  }
}


export async function unpublishProject(projectId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(publicationSnapshots)
      .set({ status: "removed" })
      .where(and(eq(publicationSnapshots.projectId, projectId), eq(publicationSnapshots.status, "active")))
    await tx
      .update(projects)
      .set({ status: "planning", publishedAt: null, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
  })
  return { ok: true }
}

export async function recordSignal(projectId: string, type: string, value = "") {
  await db.insert(validationSignals).values({ projectId, type, value })
}

export async function getSignalCounts(projectId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ type: validationSignals.type, count: sql<number>`count(*)::int` })
    .from(validationSignals)
    .where(eq(validationSignals.projectId, projectId))
    .groupBy(validationSignals.type)
  const counts = Object.fromEntries(rows.map((row) => [row.type, Number(row.count)]))
  return {
    visit: counts.visit ?? 0,
    cta_click: counts.cta_click ?? 0,
    email: counts.email ?? 0,
    earlybird: counts.earlybird ?? 0,
    ...counts,
  }
}
