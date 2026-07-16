import { createHash } from "node:crypto"

import type { TikTokCompetitorResearch } from "@/lib/apify/tiktok-shop-research"
import type {
  CleanCreativeEvidence,
  CompetitiveCreativeBundle,
  CompetitiveCreativeEvidence,
  CreativeCluster,
} from "@/lib/artifacts/design-reinforcement-artifact"

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`
}

function parsePrice(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`.replace(/\/$/, "")
  } catch {
    return value.trim()
  }
}

function competitorKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || "unknown"
}

export function buildCompetitiveCreativeBundle(
  research: TikTokCompetitorResearch,
  query: string,
): CompetitiveCreativeBundle {
  const evidence: CompetitiveCreativeEvidence[] = research.products.map((product) => ({
    evidence_id: stableId("ev", `${research.collection.actorRunId}:${product.productId}:${product.productUrl}`),
    competitor_name: product.brand || product.sellerName,
    source_url: product.productUrl,
    platform: "tiktok",
    title: product.title,
    description: product.description || undefined,
    media: {
      video_url: product.videoUrls[0],
      image_urls: product.imageUrls.slice(0, 3),
      cover_image: product.imageUrls[0],
      sampled_frames: [],
    },
    commercial_signals: {
      price: parsePrice(product.currentPrice),
      price_label: product.price,
      sold_count: product.soldCount,
      review_count: product.reviewCount,
      rating: product.rating,
    },
    collection_context: {
      search_query: query,
      collected_at: research.collection.collectedAt,
      actor_run_id: research.collection.actorRunId,
      dataset_id: research.collection.datasetId,
    },
  }))

  const warnings = [...research.warnings]
  if (evidence.some((item) => !item.media.video_url)) {
    warnings.push("当前 TikTok Shop Dataset 的部分记录没有视频 URL；这些证据只参与商品图规律分析，不推断剪辑与视频钩子。")
  }
  if (evidence.every((item) => !item.performance_signals)) {
    warnings.push("当前 Actor 未返回播放、点赞、评论、分享或发布时间；销量与评论仅作为商业代理信号，不等同于视频表现。")
  }

  return {
    bundle_id: stableId("bundle", `${research.collection.actorRunId}:${query}`),
    platform: "tiktok",
    evidence,
    actor_run_id: research.collection.actorRunId,
    dataset_id: research.collection.datasetId,
    created_at: research.collection.collectedAt,
    warnings,
  }
}

export function cleanCreativeEvidence(bundle: CompetitiveCreativeBundle): CleanCreativeEvidence {
  const rejected: CleanCreativeEvidence["rejected"] = []
  const accepted: CompetitiveCreativeEvidence[] = []
  const seenSources = new Set<string>()
  const seenMedia = new Set<string>()
  const perCompetitor = new Map<string, number>()

  for (const evidence of bundle.evidence) {
    const source = canonicalUrl(evidence.source_url)
    if (!source || seenSources.has(source)) {
      rejected.push({ evidence_id: evidence.evidence_id, reason: "重复或无效的来源 URL" })
      continue
    }

    const images = evidence.media.image_urls.filter((url) => {
      const key = canonicalUrl(url)
      if (!key || seenMedia.has(key)) return false
      seenMedia.add(key)
      return true
    })
    const videoKey = evidence.media.video_url ? canonicalUrl(evidence.media.video_url) : ""
    const videoUrl = videoKey && !seenMedia.has(videoKey) ? evidence.media.video_url : undefined
    if (videoKey && videoUrl) seenMedia.add(videoKey)
    if (!images.length && !videoUrl) {
      rejected.push({ evidence_id: evidence.evidence_id, reason: "没有可用的产品图片或视频，或媒体与已有证据完全重复" })
      continue
    }

    const key = competitorKey(evidence.competitor_name)
    const count = perCompetitor.get(key) ?? 0
    if (count >= 5) {
      rejected.push({ evidence_id: evidence.evidence_id, reason: "同一竞品核心证据超过 5 条上限" })
      continue
    }
    if (accepted.length >= 20) {
      rejected.push({ evidence_id: evidence.evidence_id, reason: "单次深度分析已达到 20 条核心证据上限" })
      continue
    }

    perCompetitor.set(key, count + 1)
    seenSources.add(source)
    accepted.push({
      ...evidence,
      media: {
        ...evidence.media,
        video_url: videoUrl,
        image_urls: images.slice(0, 5),
        cover_image: images.includes(evidence.media.cover_image ?? "") ? evidence.media.cover_image : images[0],
      },
    })
  }

  const clusters: CreativeCluster[] = [...perCompetitor.entries()].map(([key]) => {
    const ids = accepted.filter((item) => competitorKey(item.competitor_name) === key).map((item) => item.evidence_id)
    return {
      cluster_id: stableId("cluster", `${bundle.bundle_id}:${key}`),
      label: accepted.find((item) => competitorKey(item.competitor_name) === key)?.competitor_name ?? key,
      basis: "competitor",
      evidence_ids: ids,
    }
  })

  return { accepted, rejected, clusters }
}

function logScore(value: number | undefined, scale: number) {
  if (!value || value <= 0) return 0
  return Math.min(100, Math.round((Math.log10(value + 1) / scale) * 100))
}

export function evidencePerformanceScore(evidence: CompetitiveCreativeEvidence) {
  const performance = evidence.performance_signals
  if (performance && [performance.views, performance.likes, performance.comments, performance.shares].some((value) => value !== undefined)) {
    return Math.round(
      logScore(performance.views, 7) * 0.45
      + logScore(performance.likes, 6) * 0.25
      + logScore(performance.comments, 5) * 0.15
      + logScore(performance.shares, 5) * 0.15,
    )
  }

  const commercial = evidence.commercial_signals
  if (!commercial) return 0
  const proxy =
    logScore(commercial.sold_count, 6) * 0.55
    + logScore(commercial.review_count, 5) * 0.3
    + Math.min(100, Math.max(0, ((commercial.rating ?? 0) / 5) * 100)) * 0.15
  return Math.min(70, Math.round(proxy * 0.7))
}

export function evidenceFreshnessScore(evidence: CompetitiveCreativeEvidence) {
  const postedAt = evidence.performance_signals?.posted_at
  if (!postedAt) return 50
  const ageDays = Math.max(0, (Date.now() - new Date(postedAt).getTime()) / 86_400_000)
  if (!Number.isFinite(ageDays)) return 50
  if (ageDays <= 30) return 100
  if (ageDays <= 90) return 85
  if (ageDays <= 180) return 70
  if (ageDays <= 365) return 50
  return 25
}

export function evidenceSignalGaps(evidence: CompetitiveCreativeEvidence[]) {
  const gaps: string[] = []
  if (evidence.some((item) => !item.media.video_url && !item.media.sampled_frames?.length)) {
    gaps.push("部分竞品缺少视频或抽帧，因此不能对前 1 秒钩子、剪辑速度和 CTA 时序下结论。")
  }
  if (evidence.some((item) => !item.performance_signals?.views)) {
    gaps.push("部分证据缺少播放量，Pattern performance_score 可能使用受限的销量/评论代理信号。")
  }
  if (evidence.some((item) => !item.performance_signals?.posted_at)) {
    gaps.push("部分证据缺少发布时间，新鲜度只能按未知值处理。")
  }
  return gaps
}
