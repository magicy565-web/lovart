import type { BriefContent, ResearchContent } from "@/lib/studio/types"

type ParallelResearch = Pick<ResearchContent, "summary" | "marketSize" | "competitors" | "trends">

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "一句话市场总览，简体中文" },
    marketSize: { type: "string", description: "可查证的市场规模、增速和关键数字；无法确认时明确说明" },
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "真实存在的品牌或产品名" },
          price: { type: "string", description: "带币种的价格或合理估算区间" },
          note: { type: "string", description: "定位、差异或证据限制" },
        },
        required: ["name", "price", "note"],
        additionalProperties: false,
      },
    },
    trends: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "marketSize", "competitors", "trends"],
  additionalProperties: false,
}

function unavailableResearch(brief: BriefContent, reason: string): ResearchContent {
  return {
    summary: `尚未完成“${brief.productName}”的联网市场验证。${reason}`,
    marketSize: "待联网研究验证，不展示未经来源支持的市场数字。",
    competitors: [],
    trends: [],
    opportunity: "需要获得真实竞品、价格和用户证据后再确定众筹切入机会。",
    sources: [],
  }
}

export async function researchMarketForBrief(brief: BriefContent): Promise<ResearchContent> {
  if (!serverEnv.PARALLEL_API_KEY) return unavailableResearch(brief, "当前环境未配置研究服务密钥。")
  const base = serverEnv.PARALLEL_BASE_URL.replace(/\/$/, "")
  const query = `${brief.productName}（${brief.form}）市场研究。目标用户：${brief.audience}。重点检索真实竞品、价格、购买动机、市场趋势和众筹机会。`

  try {
    const createRes = await fetch(`${base}/v1/tasks/runs`, {
      method: "POST",
      headers: { "x-api-key": serverEnv.PARALLEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: `${query}\n要求：竞品必须是真实具体产品并带币种价格；不确定数据必须标注估算或无法确认；全部使用简体中文。`,
        processor: "base-fast",
        task_spec: { output_schema: { type: "json", json_schema: RESEARCH_SCHEMA } },
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!createRes.ok) return unavailableResearch(brief, `研究服务创建任务失败（${createRes.status}）。`)
    const { run_id } = (await createRes.json()) as { run_id: string }
    const resultRes = await fetch(`${base}/v1/tasks/runs/${run_id}/result`, {
      headers: { "x-api-key": serverEnv.PARALLEL_API_KEY },
      signal: AbortSignal.timeout(280_000),
    })
    if (!resultRes.ok) return unavailableResearch(brief, `研究服务返回 ${resultRes.status}。`)

    const data = (await resultRes.json()) as {
      output?: { content?: ParallelResearch; basis?: Array<{ citations?: Array<{ title?: string; url?: string }> }> }
    }
    if (!data.output?.content) return unavailableResearch(brief, "研究服务未返回结构化结果。")

    const seen = new Set<string>()
    const sources: ResearchContent["sources"] = []
    for (const basis of data.output.basis ?? []) {
      for (const citation of basis.citations ?? []) {
        if (!citation.url || seen.has(citation.url)) continue
        seen.add(citation.url)
        sources.push({ title: citation.title || citation.url, url: citation.url })
        if (sources.length >= 10) break
      }
      if (sources.length >= 10) break
    }

    const content = data.output.content
    const competitorGap = content.competitors.length
      ? `相对于${content.competitors.slice(0, 3).map((item) => item.name).join("、")}，应优先验证${brief.sellingPoints[0] ?? brief.tagline}是否形成可感知差异。`
      : "仍需补齐竞品样本后判断差异化空间。"
    return {
      ...content,
      opportunity: `${competitorGap} 当前结论只覆盖已列来源，不代表完整市场。`,
      sources,
    }
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "TimeoutError"
      ? "研究请求超时。"
      : `研究失败：${error instanceof Error ? error.message : "未知错误"}。`
    return unavailableResearch(brief, reason)
  }
}
import { serverEnv } from "@/lib/config/server"
