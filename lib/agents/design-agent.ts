import type { ReferenceStyleProfile } from "@/lib/design/style-analysis"
import type { VisualDirection } from "@/lib/artifacts/competitor-style-artifact"
import { serverEnv } from "@/lib/config/server"

type ModelResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>
}

type DirectionResult = {
  visualDirections: VisualDirection[]
  designWarning?: string
}

function cleanText(value: unknown, maxLength = 2_000) {
  if (typeof value !== "string") return ""
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
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
    if (start < 0 || end <= start) throw new Error("设计模型没有返回有效 JSON")
    return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>
  }
}

function originalConstraint(profile: ReferenceStyleProfile) {
  const avoid = profile.avoid.length ? profile.avoid.join(", ") : "competitor logos, brand text, packaging, copied product identity"
  return `Create an original design. Do not reproduce ${avoid}. No competitor logo, brand name, packaging, copyrighted character, or one-to-one product shape.`
}

function fallbackDirections(profile: ReferenceStyleProfile, designGoal: string): VisualDirection[] {
  const base = `${profile.designPrompt} Product goal: ${cleanText(designGoal, 600)}. ${originalConstraint(profile)}`
  const prompt = (direction: string) => cleanText(`${base} ${direction}`, 1_950)
  return [
    {
      id: "studio-hero",
      title: "影棚主视觉",
      description: "强调产品轮廓、材质和高级感，适合众筹首屏与商品主图。",
      prompt: prompt("Direction: premium studio hero image, one clear focal product, precise material rendering, controlled key light, generous negative space, campaign-ready composition."),
    },
    {
      id: "lifestyle-proof",
      title: "真实使用场景",
      description: "把产品放进可信的使用情境，突出目标用户与实际价值。",
      prompt: prompt("Direction: believable lifestyle product photography, the product in active use by the intended audience, natural environmental light, clear functional storytelling, authentic details, no staged stock-photo feeling."),
    },
    {
      id: "social-hook",
      title: "TikTok 传播钩子",
      description: "用更强的视觉抓力表现核心卖点，适合短视频封面与广告素材。",
      prompt: prompt("Direction: scroll-stopping social campaign key visual, immediate product benefit, dynamic but clean composition, bold lighting contrast, tactile close-up detail, designed for a vertical TikTok cover while preserving premium credibility."),
    },
  ]
}

function normalizeDirections(value: Record<string, unknown>, profile: ReferenceStyleProfile, designGoal: string) {
  const raw = Array.isArray(value.visualDirections) ? value.visualDirections : []
  const directions = raw.slice(0, 3).map((item, index) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    return {
      id: cleanText(record.id, 64) || `direction-${index + 1}`,
      title: cleanText(record.title, 80),
      description: cleanText(record.description, 220),
      prompt: cleanText(record.prompt, 2_000),
    }
  })
  if (directions.length !== 3 || directions.some((direction) => !direction.title || !direction.description || !direction.prompt)) {
    return fallbackDirections(profile, designGoal)
  }
  return directions
}

export async function createVisualDirections({
  styleProfile,
  designGoal,
}: {
  styleProfile: ReferenceStyleProfile
  designGoal: string
}): Promise<DirectionResult> {
  const fallback = fallbackDirections(styleProfile, designGoal)
  const apiKey = serverEnv.MIMO_API_KEY
  if (!apiKey) return { visualDirections: fallback, designWarning: "未配置 MIMO_API_KEY，视觉板使用了安全的默认原创方向。" }

  const prompt = `你是独立的产品视觉总监。根据下面的 Style DNA 与产品目标，提出 3 个差异明显但都可执行的原创视觉方向。

产品目标：${cleanText(designGoal, 700)}
Style DNA：${JSON.stringify(styleProfile)}

三个方向必须分别适用于：
1. 众筹首屏/商品主图
2. 真实使用场景
3. TikTok 短视频封面/传播素材

要求：
- 只继承高层配色、灯光、构图和材质语言，不复制任何竞品身份。
- prompt 必须为详细英文生图提示，完整描述原创产品目标、场景、光线、构图、材质与排除项。
- 每个方向必须明确排除竞品 logo、文字、包装、角色和一比一产品造型。
- 只返回 JSON：{"visualDirections":[{"id":"...","title":"中文","description":"中文","prompt":"English"}]}。`

  try {
    const baseUrl = serverEnv.MIMO_BASE_URL.replace(/\/$/, "")
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: serverEnv.MIMO_DESIGN_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.65,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) throw new Error(`设计模型返回 ${response.status}`)
    const data = (await response.json()) as ModelResponse
    return { visualDirections: normalizeDirections(parseJson(modelText(data)), styleProfile, designGoal) }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误"
    return { visualDirections: fallback, designWarning: `视觉方向生成失败，已使用安全默认方向：${message}` }
  }
}
