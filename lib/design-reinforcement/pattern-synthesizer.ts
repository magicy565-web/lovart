import { createHash } from "node:crypto"

import type {
  CompetitiveCreativeEvidence,
  ConfirmedProductBriefInput,
  DesignTargetAsset,
  VisualFeatureObservation,
  VisualPattern,
  VisualPatternKind,
} from "@/lib/artifacts/design-reinforcement-artifact"
import { evidenceFreshnessScore, evidencePerformanceScore } from "@/lib/design-reinforcement/evidence"
import { serverEnv } from "@/lib/config/server"

type ModelResponse = { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> }

export type PatternSynthesis = {
  patternLibrary: VisualPattern[]
  visualDna: {
    brand_personality: string[]
    composition_rules: string[]
    typography_rules: string[]
    color_strategy: string[]
    imagery_rules: string[]
    motion_rules: string[]
    forbidden_patterns: string[]
  }
}

const PATTERN_KINDS = new Set<VisualPatternKind>(["category_rule", "growth_pattern", "saturated_pattern", "opportunity_pattern", "avoid"])

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return ""
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function textArray(value: unknown, limit: number, maxLength = 240) {
  if (!Array.isArray(value)) return []
  return value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, limit)
}

function modelText(data: ModelResponse) {
  const content = data.choices?.[0]?.message?.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("\n")
  return ""
}

function parseJson(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  try {
    return JSON.parse(stripped) as Record<string, unknown>
  } catch {
    const start = stripped.indexOf("{")
    const end = stripped.lastIndexOf("}")
    if (start < 0 || end <= start) throw new Error("模式综合模型没有返回有效 JSON")
    return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
  }
}

function numericScore(value: unknown, label: string) {
  const score = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(score)) throw new Error(`模式综合缺少 ${label}`)
  return Math.round(Math.min(100, Math.max(0, score)))
}

function stablePatternId(kind: VisualPatternKind, name: string, evidenceIds: string[]) {
  const hash = createHash("sha256").update(`${kind}:${name.toLowerCase()}:${[...evidenceIds].sort().join(":")}`).digest("hex").slice(0, 10)
  return `pattern_${hash}`
}

function recommendationFor(kind: VisualPatternKind) {
  if (kind === "category_rule") return "adopt" as const
  if (kind === "growth_pattern" || kind === "saturated_pattern") return "adapt" as const
  if (kind === "opportunity_pattern") return "experiment" as const
  return "avoid" as const
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

function normalizeSynthesis(
  value: Record<string, unknown>,
  evidence: CompetitiveCreativeEvidence[],
  targetAssets: DesignTargetAsset[],
): PatternSynthesis {
  const evidenceById = new Map(evidence.map((item) => [item.evidence_id, item]))
  const targetSet = new Set(targetAssets)
  const rawPatterns = Array.isArray(value.patterns) ? value.patterns : []
  const patterns: VisualPattern[] = []

  for (const item of rawPatterns.slice(0, 16)) {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const kind = cleanText(record.kind, 40) as VisualPatternKind
    if (!PATTERN_KINDS.has(kind)) continue
    const name = cleanText(record.name, 100)
    const evidenceIds = Array.isArray(record.evidence_ids)
      ? [...new Set(record.evidence_ids.filter((id): id is string => typeof id === "string" && evidenceById.has(id)))].slice(0, 12)
      : []
    const needsRepeatedEvidence = ["category_rule", "growth_pattern", "saturated_pattern"].includes(kind) && evidence.length >= 3
    if (!name || !evidenceIds.length || (needsRepeatedEvidence && evidenceIds.length < 2)) continue
    const appliesTo = Array.isArray(record.applies_to)
      ? record.applies_to.filter((asset): asset is DesignTargetAsset => typeof asset === "string" && targetSet.has(asset as DesignTargetAsset))
      : []
    const sources = evidenceIds.map((id) => evidenceById.get(id)).filter((entry): entry is CompetitiveCreativeEvidence => Boolean(entry))
    const prevalenceScore = Math.round((evidenceIds.length / evidence.length) * 100)
    const performanceScore = average(sources.map(evidencePerformanceScore))
    const freshnessScore = average(sources.map(evidenceFreshnessScore))
    const productFitScore = numericScore(record.product_fit_score, "product_fit_score")
    const feasibilityScore = numericScore(record.feasibility_score, "feasibility_score")
    const patternScore = Math.round(
      performanceScore * 0.3
      + prevalenceScore * 0.25
      + productFitScore * 0.2
      + freshnessScore * 0.15
      + feasibilityScore * 0.1,
    )
    patterns.push({
      pattern_id: stablePatternId(kind, name, evidenceIds),
      kind,
      name,
      description: cleanText(record.description, 420),
      applies_to: appliesTo.length ? [...new Set(appliesTo)] : targetAssets,
      evidence_ids: evidenceIds,
      prevalence_score: prevalenceScore,
      performance_score: performanceScore,
      product_fit_score: productFitScore,
      freshness_score: freshnessScore,
      feasibility_score: feasibilityScore,
      pattern_score: patternScore,
      use_recommendation: recommendationFor(kind),
      rationale: cleanText(record.rationale, 500),
    })
  }

  if (patterns.length < 3) throw new Error("模式综合模型没有生成至少 3 个有证据的视觉模式")
  const rawDna = value.visual_dna && typeof value.visual_dna === "object" ? value.visual_dna as Record<string, unknown> : {}
  const visualDna = {
    brand_personality: textArray(rawDna.brand_personality, 6, 100),
    composition_rules: textArray(rawDna.composition_rules, 8),
    typography_rules: textArray(rawDna.typography_rules, 8),
    color_strategy: textArray(rawDna.color_strategy, 8),
    imagery_rules: textArray(rawDna.imagery_rules, 8),
    motion_rules: textArray(rawDna.motion_rules, 8),
    forbidden_patterns: textArray(rawDna.forbidden_patterns, 10),
  }
  if (!visualDna.composition_rules.length || !visualDna.imagery_rules.length || !visualDna.forbidden_patterns.length) {
    throw new Error("模式综合模型返回的 Visual DNA 不完整")
  }
  return { patternLibrary: patterns.sort((a, b) => b.pattern_score - a.pattern_score), visualDna }
}

export async function synthesizePatternLibrary({
  evidence,
  observations,
  productBrief,
  targetAssets,
}: {
  evidence: CompetitiveCreativeEvidence[]
  observations: VisualFeatureObservation[]
  productBrief: ConfirmedProductBriefInput
  targetAssets: DesignTargetAsset[]
}) {
  const apiKey = serverEnv.MIMO_API_KEY
  if (!apiKey) throw new Error("尚未配置 MIMO_API_KEY，不能综合 VisualPatternLibrary")

  const evidenceSignals = evidence.map((item) => ({
    evidence_id: item.evidence_id,
    competitor_name: item.competitor_name,
    title: item.title,
    performance_signals: item.performance_signals ?? null,
    commercial_signals: item.commercial_signals ?? null,
    has_video: Boolean(item.media.video_url),
    has_sampled_frames: Boolean(item.media.sampled_frames?.length),
  }))
  const prompt = `你是设计研究编译器。根据已经完成的视觉观察和市场信号建立 VisualPatternLibrary 与 Visual DNA，不生成图片，也不生成生图 Prompt。

产品 Brief：${JSON.stringify(productBrief)}
目标资产：${JSON.stringify(targetAssets)}
证据信号：${JSON.stringify(evidenceSignals)}
视觉观察：${JSON.stringify(observations)}

模式必须分为：
- category_rule：当前品类必须遵守的信息或展示规则。
- growth_pattern：有多条证据支持、值得适配的增长表达。
- saturated_pattern：市场已高度同质化，必须改变视觉语言。
- opportunity_pattern：有产品匹配价值但尚未充分使用，适合实验。
- avoid：与当前产品不匹配、证据不足或存在复制风险。

严格要求：
- 每个 pattern 必须引用真实 evidence_ids；category_rule、growth_pattern、saturated_pattern 至少引用两个证据。
- “出现过”不能自动等同于“有效”。没有视频互动时，只能把销量/评论称为商业代理信号。
- product_fit_score 与 feasibility_score 为 0–100；其余评分由程序根据证据计算，不要输出。
- Visual DNA 必须是可执行规则，不能使用“高级、年轻、简洁”等空词。
- 只学习信息层级、构图、比例、对比、镜头、节奏、信任证明与 CTA 结构；禁止复制具体 Logo、包装、角色、插画、版式和单一创作者个人风格。

只返回 JSON：{"patterns":[{"kind":"category_rule","name":"...","description":"...","applies_to":["landing_page"],"evidence_ids":["ev_x","ev_y"],"product_fit_score":80,"feasibility_score":85,"rationale":"..."}],"visual_dna":{"brand_personality":[],"composition_rules":[],"typography_rules":[],"color_strategy":[],"imagery_rules":[],"motion_rules":[],"forbidden_patterns":[]}}。`

  const baseUrl = serverEnv.MIMO_BASE_URL.replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: serverEnv.MIMO_DESIGN_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) throw new Error(`模式综合模型返回 ${response.status}`)
  const data = (await response.json()) as ModelResponse
  return normalizeSynthesis(parseJson(modelText(data)), evidence, targetAssets)
}
