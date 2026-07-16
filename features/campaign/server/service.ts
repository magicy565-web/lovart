import "server-only"

import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { projects, artifacts, artifactRevisions, validationSignals, publicationSnapshots, campaignReservations, campaignRateLimits, user } from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import type { CampaignOperatingState, CampaignRuntimeState } from "@/features/campaign/contracts"
import type { BriefContent, CampaignContent, CampaignFoundationContent, PublicationSnapshotPackage, VisualsContent } from "@/lib/studio/types"

// ---- 发布页数据读取 ----

function tierIdOf(tier: CampaignContent["tiers"][number]) {
  return tier.id || tier.name.toLowerCase().replace(/\s+/g, "-")
}

async function getCampaignCreator(projectId: string): Promise<CampaignOperatingState["creator"]> {
  const [row] = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(projects)
    .leftJoin(user, eq(projects.ownerId, user.id))
    .where(eq(projects.id, projectId))
    .limit(1)
  return row?.id ? { id: row.id, name: row.name ?? "创作者", image: row.image ?? null } : null
}

function buildOperatingState(
  campaign: CampaignContent,
  evidence: PublicationSnapshotPackage["evidence"],
  creator: CampaignOperatingState["creator"],
): CampaignOperatingState {
  const approvedEvidence = evidence.filter((item) => item.status === "approved")
  const latestCheckpoint = approvedEvidence
    .map((item) => item.approvedAt)
    .filter((value): value is string | Date => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0]

  return {
    creator,
    approvedEvidenceCount: approvedEvidence.length,
    lastEvidenceCheckpoint: latestCheckpoint?.toISOString() ?? null,
    faqCount: campaign.faq.length,
  }
}

async function getCampaignRuntime(snapshotId: string, campaign: CampaignContent): Promise<CampaignRuntimeState> {
  const rows = await db
    .select({ tierId: campaignReservations.tierId, count: sql<number>`count(*)::int` })
    .from(campaignReservations)
    .where(and(eq(campaignReservations.snapshotId, snapshotId), eq(campaignReservations.status, "active")))
    .groupBy(campaignReservations.tierId)

  const counts = new Map(rows.map((row) => [row.tierId, Number(row.count)]))
  const reservationCount = rows.reduce((total, row) => total + Number(row.count), 0)
  const tierReservationCount = rows.reduce(
    (total, row) => total + (row.tierId ? Number(row.count) : 0),
    0,
  )
  const reservedValue = campaign.tiers.reduce(
    (total, tier) => total + (counts.get(tierIdOf(tier)) ?? 0) * tier.price,
    0,
  )

  return {
    reservationCount,
    tierReservationCount,
    reservedValue,
    tierAvailability: campaign.tiers.map((tier) => {
      const tierId = tierIdOf(tier)
      const reserved = counts.get(tierId) ?? 0
      const remaining = tier.limit > 0 ? Math.max(0, tier.limit - reserved) : null
      return {
        tierId,
        tierName: tier.name,
        reserved,
        remaining,
        soldOut: remaining === 0,
      }
    }),
  }
}

export async function getCampaignBySlug(slug: string) {
  const [snapshot] = await db.select().from(publicationSnapshots).where(and(eq(publicationSnapshots.slug, slug), eq(publicationSnapshots.status, "active"))).orderBy(desc(publicationSnapshots.version)).limit(1)
  if (snapshot) {
    const content = snapshot.package as PublicationSnapshotPackage
    const [runtime, creator] = await Promise.all([
      getCampaignRuntime(snapshot.id, content.campaign),
      getCampaignCreator(content.project.id),
    ])
    return {
      project: { ...content.project, status: "published" as const },
      brief: content.brief,
      foundation: content.foundation,
      visuals: content.visuals,
      campaign: content.campaign,
      snapshot: { id: snapshot.id, version: snapshot.version, mode: snapshot.mode, publishedAt: snapshot.publishedAt },
      runtime,
      operating: buildOperatingState(content.campaign, content.evidence, creator),
    }
  }

  // Legacy fallback for projects published before immutable snapshots existed.
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug))
  if (!project || project.status !== "published") return null

  const artifactRows = await db.select().from(artifacts).where(eq(artifacts.projectId, project.id))

  async function contentOf<T>(type: string): Promise<T | null> {
    const artifact = artifactRows.find((a) => a.type === type)
    if (!artifact?.currentRevisionId) return null
    const [revision] = await db
      .select()
      .from(artifactRevisions)
      .where(eq(artifactRevisions.id, artifact.currentRevisionId))
    return (revision?.content as T) ?? null
  }

  const [brief, foundation, visuals, campaign] = await Promise.all([
    contentOf<BriefContent>("brief"),
    contentOf<CampaignFoundationContent>("campaign-foundation"),
    contentOf<VisualsContent>("visual-system"),
    contentOf<CampaignContent>("campaign"),
  ])

  if (!campaign) return null
  const creator = await getCampaignCreator(project.id)
  return {
    project,
    brief,
    foundation,
    visuals,
    campaign,
    snapshot: null,
    runtime: null,
    operating: buildOperatingState(campaign, [], creator),
  }
}

// ---- 访客验证信号 ----

export async function trackVisit(projectId: string) {
  await db.insert(validationSignals).values({ projectId, type: "visit" })
}

export async function trackCtaClick(projectId: string) {
  await db.insert(validationSignals).values({ projectId, type: "cta_click" })
}

function keyHash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function consumeRateLimit(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], key: string, action: string, limit: number) {
  const windowMs = 10 * 60 * 1000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const [row] = await tx.insert(campaignRateLimits).values({ keyHash: keyHash(key), action, windowStart, count: 1 }).onConflictDoUpdate({
    target: [campaignRateLimits.keyHash, campaignRateLimits.action, campaignRateLimits.windowStart],
    set: { count: sql`${campaignRateLimits.count} + 1` },
  }).returning({ count: campaignRateLimits.count })
  return (row?.count ?? 1) <= limit
}

export async function submitEmail(projectId: string, email: string, honeypot: string, clientKey: string) {
  if (honeypot) return { ok: true }
  const normalizedEmail = normalizeEmail(email)
  return db.transaction(async (tx) => {
    const [snapshot] = await tx.select().from(publicationSnapshots).where(and(eq(publicationSnapshots.projectId, projectId), eq(publicationSnapshots.status, "active"))).orderBy(desc(publicationSnapshots.version)).limit(1)
    if (!snapshot) return { ok: false, error: "该项目当前不可预约" }
    const allowed = await consumeRateLimit(tx, `${clientKey}:${normalizedEmail}`, "lead", 8)
    if (!allowed) return { ok: false, error: "提交过于频繁，请稍后重试" }
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`email:${snapshot.id}:${normalizedEmail}`}))`)
    const [existing] = await tx.select().from(campaignReservations).where(and(eq(campaignReservations.snapshotId, snapshot.id), eq(campaignReservations.email, normalizedEmail)))
    if (existing) return { ok: true, duplicate: true }
    await tx.insert(campaignReservations).values({ snapshotId: snapshot.id, projectId, email: normalizedEmail })
    await tx.insert(validationSignals).values({ projectId, type: "email", value: normalizedEmail })
    return { ok: true }
  })
}

export async function submitEarlyBird(projectId: string, email: string, tierName: string, honeypot: string, clientKey: string) {
  if (honeypot) return { ok: true }
  const normalizedEmail = normalizeEmail(email)
  return db.transaction(async (tx) => {
    const [snapshot] = await tx.select().from(publicationSnapshots).where(and(eq(publicationSnapshots.projectId, projectId), eq(publicationSnapshots.status, "active"))).orderBy(desc(publicationSnapshots.version)).limit(1)
    if (!snapshot) return { ok: false, error: "该项目当前不可预约" }
    const allowed = await consumeRateLimit(tx, `${clientKey}:${normalizedEmail}`, "reservation", 8)
    if (!allowed) return { ok: false, error: "提交过于频繁，请稍后重试" }
    const content = snapshot.package as PublicationSnapshotPackage
    const tier = content.campaign.tiers.find((item) => item.name === tierName)
    if (!tier) return { ok: false, error: "该档位不存在或已下架" }
    const tierId = tierIdOf(tier)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`email:${snapshot.id}:${normalizedEmail}`}))`)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`tier:${snapshot.id}:${tierId}`}))`)
    const [existing] = await tx.select().from(campaignReservations).where(and(eq(campaignReservations.snapshotId, snapshot.id), eq(campaignReservations.email, normalizedEmail)))
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(campaignReservations).where(and(eq(campaignReservations.snapshotId, snapshot.id), eq(campaignReservations.tierId, tierId), eq(campaignReservations.status, "active")))
    const alreadyInTier = existing?.tierId === tierId && existing.status === "active"
    if (tier.limit > 0 && Number(count) - (alreadyInTier ? 1 : 0) >= tier.limit) return { ok: false, error: "该档位已预约满" }
    if (existing) {
      await tx.update(campaignReservations).set({ tierId, tierName, status: "active", updatedAt: new Date() }).where(eq(campaignReservations.id, existing.id))
    } else {
      await tx.insert(campaignReservations).values({ snapshotId: snapshot.id, projectId, email: normalizedEmail, tierId, tierName })
    }
    await tx.insert(validationSignals).values({ projectId, type: "earlybird", value: `${tierName}|${normalizedEmail}` })
    return { ok: true, updated: Boolean(existing) }
  })
}

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const at = normalized.indexOf("@")
  if (at <= 0) return "***"
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`
}

export type IntentLead = {
  id: string
  maskedEmail: string
  tierName: string
  kind: "email" | "earlybird"
  status: string
  createdAt: string
}

/** Creator-facing intent list: emails are masked, never returned in full. */
export async function listIntentLeads(projectId: string, limit = 30): Promise<IntentLead[]> {
  const rows = await db
    .select({
      id: campaignReservations.id,
      email: campaignReservations.email,
      tierName: campaignReservations.tierName,
      status: campaignReservations.status,
      createdAt: campaignReservations.createdAt,
    })
    .from(campaignReservations)
    .where(eq(campaignReservations.projectId, projectId))
    .orderBy(desc(campaignReservations.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100))

  return rows.map((row) => ({
    id: row.id,
    maskedEmail: maskEmail(row.email),
    tierName: row.tierName || "",
    kind: row.tierName ? ("earlybird" as const) : ("email" as const),
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }))
}
