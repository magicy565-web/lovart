import type { BriefData } from "@/lib/artifacts/product-brief-artifact"

const coreKeys = [
  "productName",
  "tagline",
  "audience",
  "form",
  "painPoints",
  "sellingPoints",
  "retailPrice",
  "earlyBirdPrice",
  "risks",
  "tasks",
] as const

function coreSnapshot(brief: BriefData) {
  return JSON.stringify(Object.fromEntries(coreKeys.map((key) => [key, brief[key]])))
}

function shortHash(source: string) {
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function normalizedLifecycle(brief: BriefData, fallbackTime: string): BriefData {
  const source = coreSnapshot(brief)
  return {
    ...brief,
    productId: brief.productId || `product_${shortHash(source)}`,
    status: brief.status === "confirmed" ? "confirmed" : "draft",
    version: Number.isFinite(brief.version) && brief.version > 0 ? brief.version : 1,
    createdAt: brief.createdAt || fallbackTime,
    updatedAt: brief.updatedAt || brief.createdAt || fallbackTime,
  }
}

export function briefCoreEquals(left: BriefData, right: BriefData) {
  return coreSnapshot(left) === coreSnapshot(right)
}

export function briefFingerprint(brief: BriefData) {
  const source = `${brief.productId}:${brief.version}:${coreSnapshot(brief)}`
  return `brief_${shortHash(source)}`
}

export function reviseProductBrief(current: BriefData, next: BriefData, updatedAt: string): BriefData {
  if (briefCoreEquals(current, next)) return current
  const normalized = normalizedLifecycle(current, updatedAt)
  const wasConfirmed = normalized.status === "confirmed"
  return {
    ...next,
    productId: normalized.productId,
    status: "draft",
    version: normalized.version + (wasConfirmed ? 1 : 0),
    createdAt: normalized.createdAt,
    updatedAt,
    confirmedAt: undefined,
    confirmedHash: undefined,
  }
}

export function confirmProductBrief(current: BriefData, confirmedAt: string): BriefData {
  const normalized = normalizedLifecycle(current, confirmedAt)
  const confirmed = {
    ...normalized,
    status: "confirmed" as const,
    updatedAt: confirmedAt,
    confirmedAt,
  }
  return { ...confirmed, confirmedHash: briefFingerprint(confirmed) }
}
