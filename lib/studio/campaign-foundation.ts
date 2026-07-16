import { z } from "zod"

import type {
  BriefContent,
  CampaignContent,
  CampaignDirection,
  CampaignFoundationContent,
  CampaignReadinessStatus,
  FoundationEvidenceItem,
  ResearchContent,
  VisualSystemContent,
} from "@/lib/studio/types"

const scoreSchema = z.number().int().min(1).max(5)
const nonEmpty = z.string().trim().min(1)

const directionSchema = z.object({
  id: z.enum(["route-a", "route-b", "route-c"]),
  code: z.enum(["A", "B", "C"]),
  title: nonEmpty,
  archetype: nonEmpty,
  thesis: nonEmpty,
  targetAudience: nonEmpty,
  purchaseReason: nonEmpty,
  storyAngle: nonEmpty,
  productScope: z.array(nonEmpty).min(1),
  visualDirection: nonEmpty,
  offerStrategy: nonEmpty,
  earlyBirdPrice: z.number().positive(),
  campaignPrice: z.number().positive(),
  retailPrice: z.number().positive(),
  scores: z.object({
    marketPotential: scoreSchema,
    differentiation: scoreSchema,
    contentPotential: scoreSchema,
    feasibility: scoreSchema,
    crowdfundingFit: scoreSchema,
  }),
  risks: z.array(nonEmpty).min(1),
  recommendation: nonEmpty,
})

const evidenceSchema = z.object({
  id: nonEmpty,
  label: nonEmpty,
  status: z.enum(["available", "needed", "launch_required", "later"]),
  truthClass: z.enum([
    "generated_concept",
    "cad_render",
    "prototype_photo",
    "production_sample",
    "manufacturing_evidence",
    "verified_data",
  ]),
  notes: z.string(),
})

export const campaignFoundationSchema = z.object({
  schemaVersion: z.literal(1),
  directions: z.array(directionSchema).length(3),
  selection: z.object({
    selectedDirectionIds: z.array(z.string()).min(1),
    instruction: z.string(),
    synthesizedAt: z.string().nullable(),
  }),
  product: z.object({
    workingName: nonEmpty,
    category: nonEmpty,
    launchVersion: nonEmpty,
    launchFeatures: z.array(nonEmpty).min(1),
    excludedFeatures: z.array(nonEmpty),
    variants: z.array(nonEmpty).min(1),
  }),
  audience: z.object({
    primarySegment: nonEmpty,
    coreSituation: nonEmpty,
    currentAlternative: nonEmpty,
    purchaseMotivation: nonEmpty,
  }),
  story: z.object({ type: nonEmpty, thesis: nonEmpty }),
  offer: z.object({
    currency: z.enum(["CNY", "USD"]),
    earlyBirdPrice: z.number().positive(),
    campaignPrice: z.number().positive(),
    retailPrice: z.number().positive(),
    rewardTiers: z.array(z.object({
      id: nonEmpty,
      name: nonEmpty,
      price: z.number().positive(),
      contents: z.array(nonEmpty).min(1),
      capacity: z.number().int().min(0),
      estimatedDelivery: nonEmpty,
      shippingNote: nonEmpty,
    })).min(1),
  }),
  evidence: z.object({ items: z.array(evidenceSchema).min(1) }),
  delivery: z.object({
    productStage: z.enum(["concept", "appearance_prototype", "functional_prototype", "production_sample"]),
    supplierStatus: z.enum(["unknown", "shortlisted", "confirmed"]),
    costRange: z.string(),
    moq: z.string(),
    certification: z.string(),
    productionLeadTime: z.string(),
    fulfillmentPlan: z.string(),
  }),
  visualDirection: z.object({
    mood: nonEmpty,
    palette: z.array(nonEmpty).min(1),
    avoid: z.array(nonEmpty),
  }),
  readiness: z.object({
    status: z.enum(["go", "conditional_go", "blocked"]),
    publicationMode: z.enum(["demo", "live"]),
    score: z.number().int().min(0).max(100),
    blockers: z.array(z.string()),
    nextActions: z.array(z.string()),
  }),
  openRisks: z.array(nonEmpty),
})

const clampPrice = (value: number) => Math.max(1, Math.round(value))

function makeDirection(
  input: Pick<BriefContent, "audience" | "sellingPoints" | "earlyBirdPrice" | "retailPrice">,
  values: Omit<CampaignDirection, "targetAudience" | "productScope" | "earlyBirdPrice" | "campaignPrice" | "retailPrice"> & {
    priceMultiplier: number
  },
): CampaignDirection {
  const earlyBirdPrice = clampPrice(input.earlyBirdPrice * values.priceMultiplier)
  const retailPrice = clampPrice(input.retailPrice * values.priceMultiplier)
  return {
    ...values,
    targetAudience: input.audience,
    productScope: input.sellingPoints,
    earlyBirdPrice,
    campaignPrice: clampPrice((earlyBirdPrice + retailPrice) / 2),
    retailPrice,
  }
}

export function buildCampaignFoundation(brief: BriefContent, research: ResearchContent): CampaignFoundationContent {
  const opportunity = research.opportunity || research.summary
  const directions: CampaignDirection[] = [
    makeDirection(brief, {
      id: "route-a",
      code: "A",
      title: "高转化实用型",
      archetype: "问题解决与演示效率",
      thesis: `用${brief.sellingPoints[0] ?? brief.tagline}形成第一眼可理解的购买理由。`,
      purchaseReason: "更快解决明确问题，以可演示功能和清晰价格降低支持门槛。",
      storyAngle: "一个长期被忽视的日常问题，终于得到更简单可靠的解决。",
      visualDirection: "高信息密度的真实演示、结构细节与前后对比，画面直接、可信。",
      offerStrategy: "强早鸟折扣、标准单人套装和易理解的双人组合。",
      priceMultiplier: 0.95,
      scores: { marketPotential: 5, differentiation: 3, contentPotential: 4, feasibility: 5, crowdfundingFit: 4 },
      risks: ["容易陷入同质化功能竞争", "价格空间可能被成本压缩"],
      recommendation: `适合优先验证真实购买意愿；市场机会依据：${opportunity}`,
    }),
    makeDirection(brief, {
      id: "route-b",
      code: "B",
      title: "品牌审美型",
      archetype: "生活方式与品牌认同",
      thesis: `把“${brief.tagline}”转化为可识别的产品仪式和长期品牌资产。`,
      purchaseReason: "用户不仅购买功能，也购买与自身生活方式一致的对象和审美表达。",
      storyAngle: "一种新的生活方式正在出现，产品成为这个变化的可见符号。",
      visualDirection: "克制、触感清晰的产品摄影，强调材质、使用空间和统一视觉语言。",
      offerStrategy: "维持价格完整性，以限定配色和创始人版本增加感知价值。",
      priceMultiplier: 1.12,
      scores: { marketPotential: 4, differentiation: 5, contentPotential: 5, feasibility: 3, crowdfundingFit: 4 },
      risks: ["需要更成熟的产品与影像资产", "品牌投入高于短期转化型路线"],
      recommendation: "适合建立长期品牌，但上线前必须补齐真实样机与高质量使用场景。",
    }),
    makeDirection(brief, {
      id: "route-c",
      code: "C",
      title: "社群共创型",
      archetype: "早期参与与共同定义",
      thesis: "把早期支持者从购买者变成产品首发版本的共同塑造者。",
      purchaseReason: "获得创始人身份、参与产品取舍，并优先体验一个仍在演进的新类别。",
      storyAngle: "用户参与创造一个新产品类别，小团队公开展示选择、实验与进展。",
      visualDirection: "真实工作台、原型迭代、团队过程和社区反馈，保留手作与实验感。",
      offerStrategy: "创始人档位、限定编号、共创投票和透明更新节奏。",
      priceMultiplier: 1,
      scores: { marketPotential: 3, differentiation: 5, contentPotential: 4, feasibility: 3, crowdfundingFit: 5 },
      risks: ["社群运营成本高", "范围容易因共创承诺而膨胀"],
      recommendation: "适合概念创新度高的产品，必须明确共创边界和不可变更的首发范围。",
    }),
  ]

  const evidence: FoundationEvidenceItem[] = [
    { id: "concept", label: "产品概念与视觉方向", status: "available", truthClass: "generated_concept", notes: "可用于表达外观方向，不能证明性能或量产准备度。" },
    { id: "prototype", label: "可运行原型连续演示", status: "launch_required", truthClass: "prototype_photo", notes: "上线前拍摄三个核心功能的连续、未剪切演示。" },
    { id: "user-tests", label: "目标用户体验记录", status: "needed", truthClass: "verified_data", notes: "至少完成 5 名核心用户的任务测试与原话记录。" },
    { id: "supplier", label: "供应商与核心工艺确认", status: "needed", truthClass: "manufacturing_evidence", notes: "记录供应商、MOQ、关键工艺和预计周期。" },
    { id: "cost", label: "成本与物流测算", status: "launch_required", truthClass: "verified_data", notes: "确认核心成本区间、运费、平台费用和退款缓冲。" },
  ]

  const base = directions[0]
  const content: CampaignFoundationContent = {
    schemaVersion: 1,
    directions,
    selection: { selectedDirectionIds: [base.id], instruction: "", synthesizedAt: null },
    product: {
      workingName: brief.productName,
      category: brief.form,
      launchVersion: `首发版 ${brief.productName}`,
      launchFeatures: brief.sellingPoints,
      excludedFeatures: ["未经验证的扩展功能", "会显著增加交付风险的非核心能力"],
      variants: ["标准版", "创始人套装"],
    },
    audience: {
      primarySegment: brief.audience,
      coreSituation: brief.painPoints[0] ?? "用户在核心使用场景中存在明确阻力。",
      currentAlternative: research.competitors.slice(0, 3).map((item) => item.name).join("、") || "分散购买多个替代产品",
      purchaseMotivation: base.purchaseReason,
    },
    story: { type: "被忽视的问题终于被解决", thesis: base.thesis },
    offer: {
      currency: "CNY",
      earlyBirdPrice: base.earlyBirdPrice,
      campaignPrice: base.campaignPrice,
      retailPrice: base.retailPrice,
      rewardTiers: [
        { id: "early-bird", name: "超级早鸟", price: base.earlyBirdPrice, contents: [`${brief.productName} ×1`], capacity: 100, estimatedDelivery: "众筹成功后 90–120 天", shippingNote: "运费将在地址确认后单独核算" },
        { id: "standard", name: "众筹标准版", price: base.campaignPrice, contents: [`${brief.productName} ×1`], capacity: 0, estimatedDelivery: "众筹成功后 120 天", shippingNote: "不包含进口税费" },
        { id: "founder", name: "创始人套装", price: base.retailPrice, contents: [`${brief.productName} ×1`, "限定版本", "创始人编号"], capacity: 200, estimatedDelivery: "优先批次发货", shippingNote: "限定内容以最终打样为准" },
      ],
    },
    evidence: { items: evidence },
    delivery: {
      productStage: "concept",
      supplierStatus: "unknown",
      costRange: "待核算",
      moq: "待确认",
      certification: "待确认适用品类认证",
      productionLeadTime: "待供应商评估",
      fulfillmentPlan: "先开放非绑定预约，完成样机、成本和物流验证后再进入正式众筹。",
    },
    visualDirection: {
      mood: base.visualDirection,
      palette: ["炭灰", "暖白", "信号橙"],
      avoid: ["竞品相同构图", "把概念渲染冒充真实样机", "通用 SaaS 图形"],
    },
    readiness: { status: "conditional_go", publicationMode: "demo", score: 0, blockers: [], nextActions: [] },
    openRisks: [...brief.risks, ...base.risks],
  }
  return withEvaluatedReadiness(content)
}

function parsePriceCap(instruction: string) {
  const match = instruction.match(/(\d+(?:\.\d+)?)\s*(美元|美金|usd|元|人民币|rmb)?\s*(?:以内|以下|封顶|不超过|max(?:imum)?|under)/i)
  if (!match) return null
  return { value: Number(match[1]), currency: /美元|美金|usd/i.test(match[2] ?? "") ? "USD" as const : undefined }
}

export function synthesizeCampaignFoundation(
  source: CampaignFoundationContent,
  selectedDirectionIds: string[],
  instruction: string,
): CampaignFoundationContent {
  const selected = source.directions.filter((direction) => selectedDirectionIds.includes(direction.id))
  if (!selected.length) throw new Error("请至少选择一条候选路线")
  const practical = selected.find((item) => item.id === "route-a")
  const aesthetic = selected.find((item) => item.id === "route-b")
  const community = selected.find((item) => item.id === "route-c")
  const base = practical ?? selected[0]
  const visual = aesthetic ?? base
  const story = community ?? aesthetic ?? base
  const cap = parsePriceCap(instruction)
  const explicitCurrencyCap = Boolean(cap?.currency)
  const campaignPrice = cap ? (explicitCurrencyCap ? cap.value : Math.min(base.campaignPrice, cap.value)) : base.campaignPrice
  const earlyBirdPrice = explicitCurrencyCap
    ? Math.max(1, Math.round(campaignPrice * 0.85))
    : Math.min(base.earlyBirdPrice, Math.max(1, campaignPrice - Math.max(1, Math.round(campaignPrice * 0.12))))
  const retailPrice = explicitCurrencyCap
    ? Math.max(campaignPrice + 1, Math.round(campaignPrice * 1.25))
    : Math.max(base.retailPrice, campaignPrice + Math.max(1, Math.round(campaignPrice * 0.2)))
  const contents = source.offer.rewardTiers.map((tier, index) => ({
    ...tier,
    price: index === 0 ? earlyBirdPrice : index === 1 ? campaignPrice : retailPrice,
  }))

  return withEvaluatedReadiness({
    ...source,
    selection: { selectedDirectionIds: selected.map((item) => item.id), instruction, synthesizedAt: new Date().toISOString() },
    audience: {
      ...source.audience,
      primarySegment: base.targetAudience,
      purchaseMotivation: practical?.purchaseReason ?? base.purchaseReason,
    },
    story: {
      type: community ? "用户参与创造一个新产品类别" : aesthetic ? "一种新的生活方式正在出现" : "被忽视的问题终于被解决",
      thesis: story.thesis,
    },
    offer: {
      ...source.offer,
      currency: cap?.currency ?? source.offer.currency,
      earlyBirdPrice,
      campaignPrice,
      retailPrice,
      rewardTiers: contents,
    },
    visualDirection: { ...source.visualDirection, mood: visual.visualDirection },
    openRisks: Array.from(new Set([...source.openRisks, ...selected.flatMap((item) => item.risks)])),
  })
}

export function evaluateCampaignReadiness(content: CampaignFoundationContent) {
  const blockers: string[] = []
  const nextActions: string[] = []
  if (!content.selection.selectedDirectionIds.length) blockers.push("尚未选择候选路线")
  if (!content.product.workingName.trim() || !content.product.launchFeatures.length) blockers.push("首发产品范围尚未锁定")
  if (!content.audience.primarySegment.trim() || !content.story.thesis.trim()) blockers.push("核心用户或众筹命题尚未锁定")
  if (!(content.offer.earlyBirdPrice > 0 && content.offer.campaignPrice > 0 && content.offer.retailPrice > 0)) blockers.push("价格结构无效")
  if (content.offer.earlyBirdPrice >= content.offer.retailPrice) blockers.push("早鸟价必须低于未来零售价")

  const prototypeReady = content.delivery.productStage === "functional_prototype" || content.delivery.productStage === "production_sample"
  const supplierReady = content.delivery.supplierStatus !== "unknown"
  const costReady = Boolean(content.delivery.costRange.trim() && content.delivery.costRange.trim() !== "待核算")
  const requiredEvidence = content.evidence.items.filter((item) => item.status === "launch_required" || item.status === "needed")
  const physicalEvidence = content.evidence.items.some((item) =>
    item.status === "available" && ["prototype_photo", "production_sample", "manufacturing_evidence", "verified_data"].includes(item.truthClass),
  )

  if (!prototypeReady) nextActions.push("完成可运行原型并拍摄连续演示")
  if (!supplierReady) nextActions.push("确认候选供应商、MOQ 与关键工艺")
  if (!costReady) nextActions.push("完成成本、运费和退款缓冲测算")
  for (const item of requiredEvidence) nextActions.push(`补齐证据：${item.label}`)

  let status: CampaignReadinessStatus = blockers.length ? "blocked" : "conditional_go"
  if (!blockers.length && prototypeReady && supplierReady && costReady && physicalEvidence && requiredEvidence.length === 0) status = "go"
  const readinessSignals = [prototypeReady, supplierReady, costReady, physicalEvidence, requiredEvidence.length === 0]
  const score = Math.max(0, Math.min(100, 35 + readinessSignals.filter(Boolean).length * 13 - blockers.length * 20))

  return {
    status,
    publicationMode: status === "go" ? "live" as const : "demo" as const,
    score,
    blockers,
    nextActions: Array.from(new Set(nextActions)).slice(0, 8),
  }
}

export function withEvaluatedReadiness(content: CampaignFoundationContent): CampaignFoundationContent {
  return { ...content, readiness: evaluateCampaignReadiness(content) }
}

export function parseCampaignFoundation(value: unknown) {
  return campaignFoundationSchema.parse(value)
}

export function buildVisualSystemFromFoundation(
  foundation: CampaignFoundationContent,
  fallback?: VisualSystemContent,
): VisualSystemContent {
  const source = fallback ?? { style: "", palette: [], keywords: [], items: [] }
  const defaultHex = ["#252B29", "#F1EFE8", "#D96A3D", "#477E78", "#737A75"]
  return {
    ...source,
    style: foundation.visualDirection.mood,
    palette: foundation.visualDirection.palette.map((name, index) => ({ name, hex: source.palette[index]?.hex ?? defaultHex[index % defaultHex.length] })),
    keywords: Array.from(new Set([
      ...foundation.visualDirection.palette,
      ...foundation.selection.selectedDirectionIds.map((id) => foundation.directions.find((item) => item.id === id)?.archetype ?? ""),
    ].filter(Boolean))).slice(0, 6),
  }
}

export function buildCampaignFromFoundation(
  foundation: CampaignFoundationContent,
  brief: BriefContent,
  fallback?: CampaignContent,
): CampaignContent {
  const source = fallback
  return {
    currency: foundation.offer.currency,
    heroTitle: foundation.product.workingName,
    heroSubtitle: foundation.story.thesis,
    problem: `${foundation.audience.coreSituation}。当前常见替代方案是${foundation.audience.currentAlternative}。`,
    solution: `${foundation.product.launchVersion}将${foundation.product.launchFeatures.join("、")}收敛为一个可交付的首发版本。`,
    features: foundation.product.launchFeatures.slice(0, 4).map((title, index) => ({
      title,
      description: brief.sellingPoints[index] && brief.sellingPoints[index] !== title
        ? brief.sellingPoints[index]
        : `该能力属于首发范围，具体表现需以原型测试和最终规格为准。`,
    })),
    specs: [
      { label: "首发版本", value: foundation.product.launchVersion },
      { label: "首发形态", value: foundation.product.category },
      { label: "版本与套装", value: foundation.product.variants.join(" / ") },
      { label: "产品阶段", value: foundation.delivery.productStage },
      { label: "认证状态", value: foundation.delivery.certification || "待确认" },
    ],
    tiers: foundation.offer.rewardTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      description: `${tier.contents.join("、")}；${tier.estimatedDelivery}；${tier.shippingNote}`,
      limit: tier.capacity,
      estimatedDelivery: tier.estimatedDelivery,
      shippingNote: tier.shippingNote,
    })),
    timeline: [
      { date: "证据阶段", event: foundation.readiness.nextActions[0] ?? "完成上线前证据检查" },
      { date: "众筹成功后", event: foundation.delivery.productionLeadTime || "生产周期待供应商确认" },
      { date: "履约阶段", event: foundation.delivery.fulfillmentPlan || "包装、物流与交付方案待确认" },
    ],
    faq: [
      { q: "现在预约会扣款吗？", a: foundation.readiness.publicationMode === "demo" ? "不会。当前为概念验证阶段，仅记录非绑定预约意向。" : "当前页面仍以预约为主，正式扣款规则以上线平台说明为准。" },
      { q: "页面中的规格已经验证了吗？", a: foundation.readiness.publicationMode === "demo" ? "尚未全部验证。性能、认证和交付信息均为目标值，需以原型测试和供应链确认结果为准。" : "已具备进入正式发布的基础证据，具体证据范围以页面标注为准。" },
      ...(source?.faq ?? []).filter((item) => !/IPX|退款|暴雨|模块/.test(`${item.q}${item.a}`)).slice(0, 2),
    ],
    goalAmount: Math.max(1, Math.round(foundation.offer.campaignPrice * 100)),
  }
}
