import { serverEnv } from "@/lib/config/server"

type JsonRecord = Record<string, unknown>

export type TikTokShopCompetitor = {
  productId: string
  title: string
  productUrl: string
  description: string
  sellerName: string
  sellerId?: string
  brand?: string
  price: string
  currentPrice: string
  originalPrice?: string
  rating?: number
  reviewCount?: number
  soldCount?: number
  salesLabel?: string
  imageUrls: string[]
  videoUrls: string[]
}

export type TikTokReferenceImage = {
  id: string
  url: string
  productId: string
  productTitle: string
  productUrl: string
  sellerName: string
}

export type TikTokCompetitorResearch = {
  products: TikTokShopCompetitor[]
  referenceImages: TikTokReferenceImage[]
  stats: {
    candidates: number
    selectedCompetitors: number
    referenceImages: number
  }
  budget: {
    maxUsd: number
    estimatedActorUsd: number
  }
  collection: {
    actorRunId: string
    datasetId: string
    collectedAt: string
  }
  warnings: string[]
}

const MAX_CANDIDATES = 12
const MAX_COMPETITORS = 5
const MIN_COMPETITORS = 3
const RESEARCH_BUDGET_USD = 0.03
const ACTOR_PRICE_PER_RESULT_USD = 0.002

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is JsonRecord => Boolean(item)) : []
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

function textValue(value: unknown) {
  const direct = stringValue(value)
  if (direct) return direct
  if (!Array.isArray(value)) return undefined
  const parts = value.map(stringValue).filter((item): item is string => Boolean(item))
  return parts.length ? parts.join("；") : undefined
}

function firstString(record: JsonRecord | undefined, keys: string[]) {
  if (!record) return undefined
  for (const key of keys) {
    const value = stringValue(record[key])
    if (value) return value
  }
  return undefined
}

function firstNumber(record: JsonRecord | undefined, keys: string[]) {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function parseCompactNumber(value: string | undefined) {
  if (!value) return undefined
  const match = value.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i)
  if (!match) return undefined
  const base = Number(match[1])
  if (!Number.isFinite(base)) return undefined
  const multiplier = match[2]?.toUpperCase() === "B" ? 1_000_000_000 : match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1
  return Math.round(base * multiplier)
}

function cleanText(value: string | undefined, maxLength = 360) {
  if (!value) return ""
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function safeHttpUrl(value: string | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function safeTikTokProductUrl(value: string | undefined) {
  const safe = safeHttpUrl(value)
  if (!safe) return undefined
  const hostname = new URL(safe).hostname.toLowerCase()
  return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com") ? safe : undefined
}

function urlArray(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const urls: string[] = []
  for (const item of values) {
    const direct = safeHttpUrl(stringValue(item))
    const record = asRecord(item)
    const nested = safeHttpUrl(firstString(record, ["url", "imageUrl", "src", "downloadUrl"]))
    const url = direct ?? nested
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

function brandName(value: unknown) {
  const direct = stringValue(value)
  if (direct) return direct
  return firstString(asRecord(value), ["brandName", "name"])
}

function actorPath(actorId: string) {
  return actorId.trim().replace("/", "~")
}

async function runTikTokShopActor(query: string) {
  const token = serverEnv.APIFY_API_TOKEN
  if (!token) throw new Error("尚未配置 APIFY_API_TOKEN")

  const apiBase = serverEnv.APIFY_API_BASE_URL.replace(/\/$/, "")
  const actorId = serverEnv.APIFY_TIKTOK_SHOP_ACTOR_ID
  const params = new URLSearchParams({
    maxItems: String(MAX_CANDIDATES),
    maxTotalChargeUsd: String(RESEARCH_BUDGET_USD),
    timeout: "90",
    waitForFinish: "60",
  })
  const response = await fetch(
    `${apiBase}/acts/${actorPath(actorId)}/runs?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scrapeType: "search",
        searchKeywords: [cleanText(query, 160)],
        sortBy: "best_sellers",
        maxItems: MAX_CANDIDATES,
        region: "us",
        includeReviews: false,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"],
          apifyProxyCountry: "US",
        },
      }),
      signal: AbortSignal.timeout(70_000),
    },
  )

  if (!response.ok) {
    const detail = cleanText(await response.text(), 240)
    throw new Error(`TikTok Shop Actor 返回 ${response.status}${detail ? `：${detail}` : ""}`)
  }

  const startPayload = asRecord((await response.json()) as unknown)
  let run = asRecord(startPayload?.data) ?? startPayload
  const runId = firstString(run, ["id"])
  if (!runId) throw new Error("TikTok Shop Actor 未返回 run ID")

  const terminalStatuses = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"])
  for (let attempt = 0; attempt < 2 && !terminalStatuses.has(firstString(run, ["status"]) ?? ""); attempt += 1) {
    const statusResponse = await fetch(`${apiBase}/actor-runs/${runId}?waitForFinish=60`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(70_000),
    })
    if (!statusResponse.ok) throw new Error(`无法读取 Apify run 状态：${statusResponse.status}`)
    const statusPayload = asRecord((await statusResponse.json()) as unknown)
    run = asRecord(statusPayload?.data) ?? statusPayload
  }

  const status = firstString(run, ["status"])
  if (status !== "SUCCEEDED") throw new Error(`TikTok Shop Actor 运行未成功：${status ?? "UNKNOWN"}`)
  const datasetId = firstString(run, ["defaultDatasetId"])
  if (!datasetId) throw new Error("TikTok Shop Actor 未返回默认 Dataset ID")

  const datasetParams = new URLSearchParams({ format: "json", clean: "true", limit: String(MAX_CANDIDATES) })
  const datasetResponse = await fetch(`${apiBase}/datasets/${datasetId}/items?${datasetParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  })
  if (!datasetResponse.ok) throw new Error(`Apify Dataset 返回 ${datasetResponse.status}`)
  const data = (await datasetResponse.json()) as unknown
  if (!Array.isArray(data)) throw new Error("TikTok Shop Actor 未返回数据集数组")
  return {
    items: asRecordArray(data).slice(0, MAX_CANDIDATES),
    runId,
    datasetId,
    collectedAt: new Date().toISOString(),
  }
}

function normalizeProduct(item: JsonRecord, index: number): TikTokShopCompetitor | undefined {
  const productId = firstString(item, ["productId", "id"]) ?? `candidate-${index + 1}`
  const title = firstString(item, ["title", "productName"])
  const productUrl = safeTikTokProductUrl(firstString(item, ["productUrl", "url"]))
  const currentPrice = firstString(item, ["currentPrice", "price", "priceRange"])
  const images = urlArray(item.imageUrls ?? item.images ?? item.imageUrl)
  if (!title || !productUrl || !currentPrice || !images.length) return undefined

  const currency = firstString(item, ["currencySymbol", "currency"])
  const currencyPrefix = currency?.toUpperCase() === "USD" ? "$" : currency ?? "$"
  const price = /[$€£¥￥]|\b(?:USD|EUR|GBP|CNY)\b/i.test(currentPrice) ? currentPrice : `${currencyPrefix}${currentPrice}`
  const salesLabel = firstString(item, ["salesVolume", "formatSoldCount", "shopFormatSold"])
  const soldCount =
    firstNumber(item, ["exactSoldCount", "soldLast30Days", "globalSold", "soldCount"]) ?? parseCompactNumber(salesLabel)

  return {
    productId,
    title: cleanText(title, 180),
    productUrl,
    description: cleanText(textValue(item.description) ?? textValue(item.sellingPoints)),
    sellerName: firstString(item, ["sellerName", "shopName"]) ?? "TikTok Shop 商家",
    sellerId: firstString(item, ["sellerId", "globalSellerId"]),
    brand: brandName(item.brand),
    price,
    currentPrice,
    originalPrice: firstString(item, ["originalPrice"]),
    rating: firstNumber(item, ["rating"]),
    reviewCount: firstNumber(item, ["reviewCount", "totalReviews"]),
    soldCount,
    salesLabel,
    imageUrls: images.slice(0, 6),
    videoUrls: urlArray(item.videoUrls ?? item.videos).slice(0, 3),
  }
}

function competitorKey(product: TikTokShopCompetitor) {
  return (product.sellerId || product.sellerName || product.brand || product.title)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
}

function rankProducts(products: TikTokShopCompetitor[]) {
  return [...products].sort((a, b) => {
    const salesDelta = (b.soldCount ?? 0) - (a.soldCount ?? 0)
    if (salesDelta) return salesDelta
    const reviewDelta = (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
    if (reviewDelta) return reviewDelta
    return (b.rating ?? 0) - (a.rating ?? 0)
  })
}

function selectCompetitors(products: TikTokShopCompetitor[]) {
  const ranked = rankProducts(products)
  const selected: TikTokShopCompetitor[] = []
  const seenCompetitors = new Set<string>()

  for (const product of ranked) {
    const key = competitorKey(product)
    if (seenCompetitors.has(key)) continue
    seenCompetitors.add(key)
    selected.push(product)
    if (selected.length >= MAX_COMPETITORS) break
  }
  return selected
}

export async function researchTikTokShopCompetitors(query: string): Promise<TikTokCompetitorResearch> {
  const actorResult = await runTikTokShopActor(query)
  const candidates = actorResult.items
    .map(normalizeProduct)
    .filter((product): product is TikTokShopCompetitor => Boolean(product))
  const products = selectCompetitors(candidates)

  if (products.length < MIN_COMPETITORS) {
    throw new Error(`只找到 ${products.length} 个同时具备在售链接、价格和商品图的 TikTok Shop 商品，请换一个更具体的英文品类关键词`)
  }

  const referenceImages = products.map((product, index) => ({
    id: `${product.productId}-${index + 1}`,
    url: product.imageUrls[0],
    productId: product.productId,
    productTitle: product.title,
    productUrl: product.productUrl,
    sellerName: product.sellerName,
  }))

  const warnings: string[] = []
  if (products.some((product) => product.soldCount === undefined && !product.salesLabel)) {
    warnings.push("部分商品没有公开销量字段，但均具有有效 TikTok Shop 在售链接、实时价格和商品图。")
  }

  return {
    products,
    referenceImages,
    stats: {
      candidates: actorResult.items.length,
      selectedCompetitors: products.length,
      referenceImages: referenceImages.length,
    },
    budget: {
      maxUsd: RESEARCH_BUDGET_USD,
      estimatedActorUsd: Math.min(actorResult.items.length * ACTOR_PRICE_PER_RESULT_USD, RESEARCH_BUDGET_USD),
    },
    collection: {
      actorRunId: actorResult.runId,
      datasetId: actorResult.datasetId,
      collectedAt: actorResult.collectedAt,
    },
    warnings,
  }
}
