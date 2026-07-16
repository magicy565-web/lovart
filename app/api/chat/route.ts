import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { collectAndCompileTikTokDesignEvidence } from "@/lib/workflows/tiktok-design-reinforcement"
import { assembleReleasePackage, generateArtifactDraft, getProjectState, initializeProjectPipeline, saveGeneratedArtifact } from "@/features/studio/server/service"
import { ALL_PIPELINE_STAGES } from "@/lib/studio/artifact-pipeline"
import type { BriefContent as ArtifactBriefContent, ResearchContent as ArtifactResearchContent } from "@/lib/studio/types"
import { CHAT_MODEL_IDS, DEFAULT_CHAT_MODEL } from "@/lib/chat-models"
import { serverEnv } from "@/lib/config/server"

export const maxDuration = 300

const mimo = createOpenAICompatible({
  name: "mimo",
  baseURL: serverEnv.MIMO_BASE_URL,
  apiKey: serverEnv.MIMO_API_KEY,
})

const SYSTEM_PROMPT = `你是「启物」的众筹发布设计智能体,帮助用户把一个灵感变成可以上架销售验证的产品(Kickstarter 模式:先发布、后生产)。

你的能力:
- 与用户探讨目标人群、产品定义、卖点、定价档位与众筹策略
- 使用 researchMarket 工具进行真实联网市场调研（可查证的市场规模、竞品定价、市场趋势与数据来源），需要真实数据支撑定价或定位时调用；调研卡片只呈现事实，众筹切入机会由你在回复里综合研究结果给出
- 使用 createProductBrief 工具，把用户灵感快速整理成可编辑、可确认、带稳定产品 ID 的结构化 Product Brief Draft；该工具必须优先快速返回，不等待生图
- 使用 buildDesignReinforcement 工具把 TikTok Shop 真实竞品证据编译为可追溯的 VisualPatternLibrary 与三个原创方向；每次 Apify 抓取预算上限 $0.03
- 使用 generateImage 工具独立生成产品主图、场景实拍图、品牌视觉、众筹页面设计稿等，生成结果会自动出现在用户左侧的画布上

工作方式（严格的 Artifact 流水线）：
1. 项目固定按 1 产品 Brief → 2 市场与受众洞察 → 3 众筹立项与产品定案 → 4 视觉系统 → 5 众筹页面 → 6 验证与发布计划推进，最后组装可发布项目包
2. 每次对话先调用 getArtifactPipeline 读取当前节点；只允许生成当前已解锁的节点，禁止越级
3. 用户明确要求开始、生成或继续时，调用 generateCurrentArtifact。生成后必须停止，简洁说明关键判断，并请用户在「产物」面板中确认或要求修改
4. 未经用户确认，不得生成下一节点；确认操作只由用户在固定操作台中完成
5. 六个节点全部确认后，用户要求组装时调用 assembleReleasePackage
6. createProductBrief、researchMarket 和 generateImage 是当前阶段内部能力；不得用它们绕过 Artifact 状态机
7. TikTok 竞品设计强化只接受画布上已确认的 Product Brief；产品定义被编辑后会回到 Draft，旧版下游产物失效，必须重新确认

规则:
- Brief 必须具体、可执行,价格为人民币整数;痛点、卖点、风险各给 3 条
- 调用 generateImage 时，必须从已生成的 Brief 原样传入 productName、productForm、tagline 和 audience；不得虚构或替换品牌名、产品品类、材质与配色
- prompt 只补充风格、构图、光线和环境，产品身份由上述品牌字段决定；title 用简短中文
- 竞品素材只可用于提炼配色、光线、构图、背景和材质等高层视觉规律；不得复制竞品商标、文字、包装、角色、专利外观或独特产品造型
- 回复始终使用简体中文,简洁专业,不要重复工具卡片中的全部内容`

async function requestImage(prompt: string) {
  return fetch(`${serverEnv.KUAIPAO_BASE_URL.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.KUAIPAO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2-1k",
      prompt,
      size: "1024x1024",
      n: 1,
      response_format: "url",
    }),
    signal: AbortSignal.timeout(150_000),
  })
}

async function generateImageFile(prompt: string): Promise<{ url?: string; error?: string }> {
  if (!serverEnv.KUAIPAO_API_KEY) return { error: "尚未配置 KUAIPAO_API_KEY" }

  try {
    const res = await requestImage(prompt)
    // 不在一次聊天请求内静默重跑耗时生图任务；失败立即反馈，由用户决定是否重试。
    if (!res.ok) return { error: `image2 1K 生图服务返回 ${res.status}，请稍后重试` }

    const data = (await res.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>
      images?: Array<{ url?: string; b64_json?: string }>
    }
    const item = data.data?.[0] ?? data.images?.[0]
    if (item?.url) return { url: item.url }
    if (item?.b64_json) return { url: `data:image/png;base64,${item.b64_json}` }
    return { error: "image2 1K 未返回图像，请调整描述后重试" }
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") return { error: "image2 1K 生成超时，请重试" }
    return { error: error instanceof Error ? error.message : "未知错误" }
  }
}

type ResearchSource = { title: string; url: string }
type ResearchContent = {
  summary: string
  marketSize: string
  competitors: Array<{ name: string; price: string; note: string }>
  trends: string[]
  opportunity: string
}

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "一句话市场总览（简体中文）" },
    marketSize: { type: "string", description: "市场规模、增速与关键数字（简体中文）" },
    competitors: {
      type: "array",
      description: "3-5 个主要竞品，每个都必须是真实存在的具体品牌或产品",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "真实的品牌名或产品名，例如「小米」「Yeelight 逸新」，禁止填价格或品类描述" },
          price: { type: "string", description: "该竞品的价格或价格区间，必须含币种，例如「￥129-199」" },
          note: { type: "string", description: "该竞品的市场定位或差异化卖点，一句话简体中文" },
        },
        required: ["name", "price", "note"],
        additionalProperties: false,
      },
    },
    trends: { type: "array", description: "3-5 条市场趋势（简体中文）", items: { type: "string" } },
    opportunity: { type: "string", description: "基于已检索证据提出的众筹切入机会假设，必须明确这是待验证判断（简体中文）" },
  },
  required: ["summary", "marketSize", "competitors", "trends", "opportunity"],
  additionalProperties: false,
}

async function runMarketResearch(
  query: string,
): Promise<{ content?: ResearchContent; sources?: ResearchSource[]; error?: string }> {
  if (!serverEnv.PARALLEL_API_KEY) return { error: "尚未配置 PARALLEL_API_KEY" }
  const base = serverEnv.PARALLEL_BASE_URL.replace(/\/$/, "")
  try {
    const createRes = await fetch(`${base}/v1/tasks/runs`, {
      method: "POST",
      headers: { "x-api-key": serverEnv.PARALLEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: `${query}

要求：
1. competitors 必须列出 3-5 个该品类的主流品牌/产品，每个都要给出价格（含币种和数字，如「￥129-259」）；若确切报价难以确定，给出合理的市场估算区间并在 note 中标注「估算」，不要写「未提供」，也不要因为价格不确定就减少竞品数量。
2. 所有字段内容用简体中文输出。`,
        processor: "base-fast",
        task_spec: { output_schema: { type: "json", json_schema: RESEARCH_SCHEMA } },
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!createRes.ok) return { error: `研究服务创建任务失败（${createRes.status}）` }
    const { run_id } = (await createRes.json()) as { run_id: string }

    const resultRes = await fetch(`${base}/v1/tasks/runs/${run_id}/result`, {
      headers: { "x-api-key": serverEnv.PARALLEL_API_KEY },
      signal: AbortSignal.timeout(280_000),
    })
    if (!resultRes.ok) return { error: `研究服务返回 ${resultRes.status}，请稍后重试` }

    const data = (await resultRes.json()) as {
      output?: { content?: ResearchContent; basis?: Array<{ citations?: Array<{ title?: string; url?: string }> }> }
    }
    const content = data.output?.content
    if (!content) return { error: "研究服务未返回结果，请调整问题后重试" }

    const seen = new Set<string>()
    const sources: ResearchSource[] = []
    for (const basis of data.output?.basis ?? []) {
      for (const citation of basis.citations ?? []) {
        if (!citation.url || seen.has(citation.url)) continue
        seen.add(citation.url)
        sources.push({ title: citation.title || citation.url, url: citation.url })
        if (sources.length >= 8) break
      }
      if (sources.length >= 8) break
    }
    return { content, sources }
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") return { error: "研究超时，请缩小范围后重试" }
    return { error: error instanceof Error ? error.message : "未知错误" }
  }
}

type ResearchToolResult = Awaited<ReturnType<typeof runMarketResearch>> & {
  persistenceError?: string
  evidenceId?: string
  parentId?: string
}

type CanvasProductBrief = {
  productId: string
  status: "draft" | "confirmed"
  version: number
  confirmedAt?: string
  confirmedHash?: string
  productName: string
  audience: string
  productForm: string
  painPoints: string[]
  sellingPoints: string[]
  targetPrice?: number
}

type CanvasContextItem = {
  id: string
  type: string
  title: string
  text?: string
  prompt?: string
  hasImage?: boolean
  stale?: boolean
  productBrief?: CanvasProductBrief
  x: number
  y: number
  width: number
  height: number
}
type CanvasContext = { totalItems: number; selected: CanvasContextItem[]; items: CanvasContextItem[] }

async function runVisualCompetitorResearch(input: {
  researchArtifact: { researchId: string; topic: string; query: string; designGoal: string; hypotheses: string[] }
  productBrief: CanvasProductBrief & { status: "confirmed"; confirmedAt: string; confirmedHash: string }
  targetAssets: Array<"landing_page" | "product_images" | "tiktok_creatives">
}, sourceBrief?: CanvasProductBrief) {
  try {
    if (input.productBrief.status !== "confirmed") throw new Error("设计强化只接受已确认的 Product Brief")
    if (!sourceBrief || sourceBrief.status !== "confirmed" || sourceBrief.productId !== input.productBrief.productId || sourceBrief.version !== input.productBrief.version || sourceBrief.confirmedAt !== input.productBrief.confirmedAt || sourceBrief.confirmedHash !== input.productBrief.confirmedHash) {
      throw new Error("工具参数与画布中已确认的 Product Brief 版本不匹配，请先在画布确认最新版本")
    }
    return await collectAndCompileTikTokDesignEvidence({
      productBrief: {
        product_id: input.productBrief.productId,
        status: input.productBrief.status,
        version: input.productBrief.version,
        confirmed_at: input.productBrief.confirmedAt,
        confirmed_hash: input.productBrief.confirmedHash,
        product_name: input.productBrief.productName,
        audience: input.productBrief.audience,
        product_form: input.productBrief.productForm,
        pain_points: input.productBrief.painPoints,
        selling_points: input.productBrief.sellingPoints,
        target_price: input.productBrief.targetPrice,
      },
      researchArtifact: {
        research_id: input.researchArtifact.researchId,
        topic: input.researchArtifact.topic,
        query: input.researchArtifact.query,
        design_goal: input.researchArtifact.designGoal,
        hypotheses: input.researchArtifact.hypotheses,
      },
      targetAssets: input.targetAssets,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "TikTok 设计强化失败" }
  }
}

function describeCanvas(context: CanvasContext | undefined) {
  if (!context || !context.totalItems) return ""
  const line = (item: CanvasContextItem) =>
    `- [${item.type}] ${item.title}（${item.width}×${item.height} @ ${item.x},${item.y}）${item.text ? ` 文字内容：「${item.text}」` : ""}${item.prompt ? ` 生成描述：「${item.prompt}」` : ""}${item.hasImage ? " 含图像" : ""}`
  const selected = context.selected.length
    ? `\n用户当前选中了 ${context.selected.length} 个对象：\n${context.selected.map(line).join("\n")}`
    : "\n用户当前没有选中任何对象。"
  return `\n\n【画布实时状态】画布上共有 ${context.totalItems} 个对象。${selected}\n画布全部对象：\n${context.items.map(line).join("\n")}\n当用户提到「这个」「选中的」「这几张图」时，指的就是上面选中的对象。回答排版、配色、文案建议时请基于这些实际内容。`
}

export async function POST(req: Request) {
  const {
    messages,
    canvasContext,
    projectContext,
    config,
    onboarding,
    confirmedDirection,
  }: {
    messages: UIMessage[]
    canvasContext?: CanvasContext
    projectContext?: { projectId?: string }
    config?: { modelId?: string; reasoningEffort?: "low" | "medium" | "high" }
    onboarding?: boolean
    confirmedDirection?: { parentId: string; product: string; user: string; scenario: string; title: string; description: string }
  } = await req.json()
  const modelId = config?.modelId && CHAT_MODEL_IDS.has(config.modelId) ? config.modelId : DEFAULT_CHAT_MODEL
  const selectedModel = modelId === DEFAULT_CHAT_MODEL ? mimo("mimo-v2.5-pro") : modelId
  const reasoning = modelId.startsWith("openai/gpt-5.6-") ? (config?.reasoningEffort ?? "medium") : undefined
  const projectLine = projectContext?.projectId ? `\n\n【当前项目】ID: ${projectContext.projectId}。所有后续产物、画布修改和任务都必须归属于该项目。` : ""
  const onboardingPrompt = onboarding ? `\n\n【首次产品探索协议】这是新项目的第一条需求。你只能提炼最小“产品种子”，必须调用 createProductSeed，给出两个互斥、具体、可执行的方向。不要调用流水线、Brief、市场研究或生图工具；不要提前生成完整方案。工具调用后用一句话邀请用户选择方向。` : ""
  const directionPrompt = confirmedDirection ? `\n\n【方向市场验证协议】用户已确认“${confirmedDirection.title}”：${confirmedDirection.description}。产品：${confirmedDirection.product}；目标用户：${confirmedDirection.user}；场景：${confirmedDirection.scenario}。本轮只能调用一次 researchMarket，必须检索真实竞品、价格、趋势和可点击来源。不得调用 Brief、生图或 Artifact 工具。` : ""
  const researchExecutions = new Map<string, Promise<ResearchToolResult>>()

  const result = streamText({
    model: selectedModel,
    reasoning,
    system: SYSTEM_PROMPT + projectLine + onboardingPrompt + directionPrompt + describeCanvas(canvasContext),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(onboarding || confirmedDirection ? 2 : 6),
    toolChoice: onboarding ? { type: "tool", toolName: "createProductSeed" } : confirmedDirection ? { type: "tool", toolName: "researchMarket" } : "auto",
    tools: {
      createProductSeed: tool({
        description: "把新项目的第一条模糊灵感提炼为最小产品种子和两个互斥方向，不生成完整 Brief。",
        inputSchema: z.object({
          product: z.string().describe("一句清晰的产品定义"),
          user: z.string().describe("具体核心用户"),
          scenario: z.string().describe("一个高频使用场景"),
          problem: z.string().describe("用户最核心的问题"),
          directions: z.array(
            z.object({ title: z.string(), description: z.string() }),
          ).length(2).describe("两个互斥且可执行的产品方向"),
        }),
        execute: async (seed) => seed,
      }),
      getArtifactPipeline: tool({
        description: "读取当前项目 1–6 Artifact 流水线状态、当前可执行节点和版本。开始任何项目产出前必须先调用。",
        inputSchema: z.object({}),
        execute: async () => {
          const projectId = projectContext?.projectId
          if (!projectId) return { error: "当前对话没有项目 ID" }
          await initializeProjectPipeline(projectId)
          const state = await getProjectState(projectId)
          if (!state) return { error: "产出链尚未初始化，请用户先在产物面板点击初始化" }
          return {
            project: state.project.name,
            stages: ALL_PIPELINE_STAGES.map((stage) => {
              const artifact = state.artifacts.find((item) => item.type === stage.type)
              const revisions = artifact ? state.revisions.filter((revision) => revision.artifactId === artifact.id) : []
              return { sequence: stage.sequence, type: stage.type, title: stage.title, status: artifact?.status ?? "missing", version: revisions.at(-1)?.version ?? 0 }
            }),
          }
        },
      }),
      generateCurrentArtifact: tool({
        description: "生成当前已解锁的 Artifact 并提交人工确认。用户明确要求开始、生成、继续或按当前方向执行时调用。",
        inputSchema: z.object({ instruction: z.string().optional().describe("用户对当前节点的补充要求") }),
        execute: async ({ instruction }) => {
          const projectId = projectContext?.projectId
          if (!projectId) return { error: "当前对话没有项目 ID" }
          await initializeProjectPipeline(projectId)
          const state = await getProjectState(projectId)
          if (!state) return { error: "请先在产物面板初始化产出链" }
          const current = state.artifacts.find((artifact) => ["ready", "failed", "stale"].includes(artifact.status))
          if (!current) return { error: "当前没有可生成节点，可能正在等待用户确认" }
          const revision = current.type === "release-package"
            ? await assembleReleasePackage(projectId)
            : await generateArtifactDraft(projectId, current.id, instruction)
          return { artifactId: current.id, type: current.type, title: current.title, status: "review", version: revision.version, message: "已生成并提交人工确认，请勿自动推进下一步" }
        },
      }),
      assembleReleasePackage: tool({
        description: "仅在六个 Artifact 全部获得用户确认后，组装最终可发布项目包。",
        inputSchema: z.object({}),
        execute: async () => {
          const projectId = projectContext?.projectId
          if (!projectId) return { error: "当前对话没有项目 ID" }
          await initializeProjectPipeline(projectId)
          const revision = await assembleReleasePackage(projectId)
          return { status: "review", version: revision.version, message: "发布包已组装，等待用户最终确认" }
        },
      }),
      createProductBrief: tool({
        description: "快速创建结构化 Product Brief 并立即添加到画布，不等待产品主图生成。用户提出新产品、品牌或众筹创意时优先调用；如需主图，在 Brief 返回后另行调用 generateImage。",
        inputSchema: z.object({
          productName: z.string().describe("简洁的中文产品名"),
          tagline: z.string().describe("一句有记忆点的产品标语"),
          audience: z.string().describe("具体目标人群与使用场景"),
          form: z.string().describe("产品形态、核心结构与材质"),
          painPoints: z.array(z.string()).length(3),
          sellingPoints: z.array(z.string()).length(3),
          retailPrice: z.number().int().positive(),
          earlyBirdPrice: z.number().int().positive(),
          risks: z.array(z.string()).length(3),
          tasks: z.array(z.object({
            title: z.string(),
            note: z.string(),
          })).length(4).describe("依次为产品定义、视觉方向、众筹页面、需求验证"),
        }),
        execute: async (brief) => {
          const createdAt = new Date().toISOString()
          let persistenceError: string | undefined
          const result = {
            brief: { ...brief, productId: randomUUID(), status: "draft" as const, version: 1, createdAt, updatedAt: createdAt },
            heroImage: null,
            heroError: null,
            createdAt,
            persistenceError,
          }
          const projectId = projectContext?.projectId
          if (projectId) {
            const content: ArtifactBriefContent = {
              productName: brief.productName,
              tagline: brief.tagline,
              audience: brief.audience,
              painPoints: brief.painPoints,
              sellingPoints: brief.sellingPoints,
              form: brief.form,
              retailPrice: brief.retailPrice,
              earlyBirdPrice: brief.earlyBirdPrice,
              risks: brief.risks,
              heroImage: null,
            }
            try {
              await saveGeneratedArtifact(projectId, "brief", content, "Agent 创建 Product Brief")
            } catch (error) {
              persistenceError = error instanceof Error ? error.message : "Product Brief 保存失败"
              result.persistenceError = persistenceError
            }
          }
          return result
        },
      }),
      researchMarket: tool({
        description:
          "调用真实联网研究能力，调研某个产品品类的市场规模、竞品与价格、趋势和众筹机会。需要真实市场数据、竞品定价或行业趋势时调用。结果会作为研究卡片添加到画布。",
        inputSchema: z.object({
          query: z.string().describe("具体的中文研究问题，包含产品品类、地区与关注维度"),
          topic: z.string().describe("研究主题的简短中文标题，如「便携桌面灯市场」"),
          evidenceId: z.string().optional().describe("方向验证时的市场证据卡 ID"),
          parentId: z.string().optional().describe("方向验证时的产品种子 ID"),
        }),
        execute: async ({ query, topic, evidenceId, parentId }) => {
          const resolvedEvidenceId = evidenceId ?? (confirmedDirection ? `market-evidence-${confirmedDirection.parentId}` : undefined)
          const resolvedParentId = parentId ?? confirmedDirection?.parentId
          const executionKey = resolvedEvidenceId ?? resolvedParentId ?? `${topic}\n${query}`
          const existing = researchExecutions.get(executionKey)
          if (existing) return existing

          const execution = (async (): Promise<ResearchToolResult> => {
            const result = await runMarketResearch(query)
            const projectId = projectContext?.projectId
            let persistenceError: string | undefined
            if (projectId && result.content) {
              const content: ArtifactResearchContent = {
                ...result.content,
                sources: result.sources ?? [],
              }
              try {
                await saveGeneratedArtifact(projectId, "research", content, `联网市场研究：${topic}`)
              } catch (error) {
                persistenceError = error instanceof Error ? error.message : "市场研究保存失败"
              }
            }
            return {
              ...result,
              persistenceError,
              evidenceId: resolvedEvidenceId,
              parentId: resolvedParentId,
            }
          })()
          researchExecutions.set(executionKey, execution)
          return execution
        },
      }),
      buildDesignReinforcement: tool({
        description: "将画布中已确认的 Product Brief 与 $0.03 预算内的 TikTok Shop 竞品证据编译为可追溯的视觉规律和三个原创设计方向。本工具不生成图片。",
        inputSchema: z.object({
          researchArtifact: z.object({
            researchId: z.string().describe("上游研究规划的稳定 ID"),
            query: z.string().describe("已确认的 TikTok Shop 搜索关键词，优先英文品类词"),
            topic: z.string().describe("调研主题的简短中文标题"),
            designGoal: z.string().describe("设计目标，不得要求复制品牌"),
            hypotheses: z.array(z.string()).min(1).max(6),
          }),
          productBrief: z.object({
            productId: z.string(),
            status: z.literal("confirmed"),
            version: z.number().int().positive(),
            confirmedAt: z.string(),
            confirmedHash: z.string(),
            productName: z.string(),
            audience: z.string(),
            productForm: z.string(),
            painPoints: z.array(z.string()).min(1).max(5),
            sellingPoints: z.array(z.string()).min(1).max(5),
            targetPrice: z.number().positive().optional(),
          }).describe("必须逐字段复用画布中的已确认 Brief，不得自行伪造"),
          targetAssets: z.array(z.enum(["landing_page", "product_images", "tiktok_creatives"])).min(1).max(3),
        }),
        execute: async (input) => {
          const sourceBrief = canvasContext?.items.find((item) => item.productBrief?.productId === input.productBrief.productId)?.productBrief
          return runVisualCompetitorResearch(input, sourceBrief)
        },
      }),
      generateImage: tool({
        description:
          "根据英文 prompt 生成一张图像（海报、插画、产品图、品牌视觉等）。生成的图像会自动添加到用户的设计画布上。",
        inputSchema: z.object({
          productName: z.string().describe("必须与 Product Brief 完全一致的品牌或产品名，不得改写"),
          productForm: z.string().describe("必须与 Product Brief 一致的产品形态、结构、材质与配色"),
          tagline: z.string().describe("必须与 Product Brief 一致的品牌标语"),
          audience: z.string().describe("必须与 Product Brief 一致的目标用户与场景"),
          prompt: z.string().describe("仅描述摄影风格、构图、光线、背景与镜头，不得替换品牌或产品"),
          title: z.string().describe("图像的简短中文标题"),
        }),
        execute: async ({ productName, productForm, tagline, audience, prompt }) => {
          const lockedPrompt = `BRAND IDENTITY LOCK — exact product/brand name: "${productName}". Exact tagline: "${tagline}". Product must be exactly: ${productForm}. Intended audience and use scenario: ${audience}. Do not introduce any other brand, logo, product category, shape, material, or color. If visible text is rendered, use only "${productName}" and "${tagline}". Creative direction: ${prompt}`
          return generateImageFile(lockedPrompt)
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
