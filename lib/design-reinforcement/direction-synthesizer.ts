import type {
  CompetitiveCreativeEvidence,
  ConfirmedProductBriefInput,
  DesignDirection,
  DesignDirectionStrategy,
  DesignTargetAsset,
  VisualPattern,
} from "@/lib/artifacts/design-reinforcement-artifact"
import type { PatternSynthesis } from "@/lib/design-reinforcement/pattern-synthesizer"
import { serverEnv } from "@/lib/config/server"

type ModelResponse = { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> }

const STRATEGIES: DesignDirectionStrategy[] = ["validated", "differentiated", "experimental"]

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
    if (start < 0 || end <= start) throw new Error("设计方向模型没有返回有效 JSON")
    return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
  }
}

function normalizeDirections(
  value: Record<string, unknown>,
  evidence: CompetitiveCreativeEvidence[],
  patterns: VisualPattern[],
) {
  const evidenceIds = new Set(evidence.map((item) => item.evidence_id))
  const patternIds = new Set(patterns.map((item) => item.pattern_id))
  const raw = Array.isArray(value.design_directions) ? value.design_directions : []
  const byStrategy = new Map<DesignDirectionStrategy, DesignDirection>()

  for (const item of raw.slice(0, 6)) {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const strategy = cleanText(record.strategy, 32) as DesignDirectionStrategy
    if (!STRATEGIES.includes(strategy) || byStrategy.has(strategy)) continue
    const referencedEvidence = Array.isArray(record.reference_evidence_ids)
      ? [...new Set(record.reference_evidence_ids.filter((id): id is string => typeof id === "string" && evidenceIds.has(id)))].slice(0, 10)
      : []
    const sourcePatterns = Array.isArray(record.source_pattern_ids)
      ? [...new Set(record.source_pattern_ids.filter((id): id is string => typeof id === "string" && patternIds.has(id)))].slice(0, 10)
      : []
    const direction: DesignDirection = {
      direction_id: `direction_${strategy}`,
      name: cleanText(record.name, 100),
      strategy,
      core_idea: cleanText(record.core_idea, 500),
      target_emotion: cleanText(record.target_emotion, 160),
      visual_keywords: textArray(record.visual_keywords, 8, 100),
      reference_evidence_ids: referencedEvidence,
      source_pattern_ids: sourcePatterns,
      layout_rules: textArray(record.layout_rules, 8),
      image_rules: textArray(record.image_rules, 8),
      copy_rules: textArray(record.copy_rules, 8),
      motion_rules: textArray(record.motion_rules, 8),
      differentiation_statement: cleanText(record.differentiation_statement, 500),
      risks: textArray(record.risks, 5),
    }
    if (
      direction.name
      && direction.core_idea
      && direction.reference_evidence_ids.length
      && direction.source_pattern_ids.length
      && direction.layout_rules.length
      && direction.image_rules.length
      && direction.differentiation_statement
    ) {
      byStrategy.set(strategy, direction)
    }
  }

  const directions = STRATEGIES.map((strategy) => byStrategy.get(strategy)).filter((item): item is DesignDirection => Boolean(item))
  if (directions.length !== 3) throw new Error("设计方向模型没有返回 validated、differentiated、experimental 三个完整方向")
  return directions
}

export async function synthesizeDesignDirections({
  evidence,
  patterns,
  visualDna,
  productBrief,
  targetAssets,
}: {
  evidence: CompetitiveCreativeEvidence[]
  patterns: VisualPattern[]
  visualDna: PatternSynthesis["visualDna"]
  productBrief: ConfirmedProductBriefInput
  targetAssets: DesignTargetAsset[]
}) {
  const apiKey = serverEnv.MIMO_API_KEY
  if (!apiKey) throw new Error("尚未配置 MIMO_API_KEY，不能生成有证据的设计方向")
  const evidenceIndex = evidence.map((item) => ({
    evidence_id: item.evidence_id,
    competitor_name: item.competitor_name,
    title: item.title,
    source_url: item.source_url,
  }))
  const prompt = `你是创意总监编译器。把 VisualPatternLibrary 编译成三个真正不同、可以继续交给 Figma/图像/视频 Agent 的设计方向；不要生成图片，不要输出生图 Prompt。

产品 Brief：${JSON.stringify(productBrief)}
目标资产：${JSON.stringify(targetAssets)}
证据索引：${JSON.stringify(evidenceIndex)}
模式库：${JSON.stringify(patterns)}
Visual DNA：${JSON.stringify(visualDna)}

必须输出：
1. validated：市场验证型，降低理解成本，优先采用 category_rule 与高匹配 growth_pattern。
2. differentiated：品牌差异型，保留有效信息结构，但主动改变 saturated_pattern 的视觉语言。
3. experimental：实验突破型，只选择有证据或明确机会模式支持的新钩子，用于 A/B 测试。

严格要求：
- 每个方向必须引用真实 reference_evidence_ids 和 source_pattern_ids。
- 三个方向的核心想法、构图规则、图像规则和风险必须明显不同，不能只是换形容词。
- 不得要求模仿任何竞品、单一创作者或复制 Logo、包装、角色、插画、独特版式。
- 规则必须是可执行约束，例如产品占比、信息顺序、镜头距离、字幕位置与动作，而不是“高级感”。

只返回 JSON：{"design_directions":[{"name":"...","strategy":"validated","core_idea":"...","target_emotion":"...","visual_keywords":[],"reference_evidence_ids":[],"source_pattern_ids":[],"layout_rules":[],"image_rules":[],"copy_rules":[],"motion_rules":[],"differentiation_statement":"...","risks":[]}]}。`

  const baseUrl = serverEnv.MIMO_BASE_URL.replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: serverEnv.MIMO_DESIGN_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.15,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) throw new Error(`设计方向模型返回 ${response.status}`)
  const data = (await response.json()) as ModelResponse
  return normalizeDirections(parseJson(modelText(data)), evidence, patterns)
}
