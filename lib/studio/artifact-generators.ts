import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"

import { serverEnv } from "@/lib/config/server"
import type { BriefContent, CampaignFoundationContent, ValidationContent } from "@/lib/studio/types"

const mimo = createOpenAICompatible({
  name: "mimo",
  baseURL: serverEnv.MIMO_BASE_URL,
  apiKey: serverEnv.MIMO_API_KEY,
})

const briefSchema = z.object({
  productName: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  painPoints: z.array(z.string().trim().min(1)).min(3).max(5),
  sellingPoints: z.array(z.string().trim().min(1)).min(3).max(5),
  form: z.string().trim().min(1),
  retailPrice: z.number().int().positive(),
  earlyBirdPrice: z.number().int().positive(),
  risks: z.array(z.string().trim().min(1)).min(3).max(5),
})

function cleanJson(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
}

function fallbackProductName(prompt: string) {
  const match = prompt.match(/(?:设计|打造|做)(?:一款|一个|一套)?([^，。；\n]{2,28})/)
  return (match?.[1] || prompt).trim().slice(0, 28) || "未命名产品"
}

function fallbackAudience(prompt: string) {
  return prompt.match(/^为([^，。；\n]{2,28})(?:设计|打造|做)/)?.[1]?.trim() || "需要进一步访谈确认的第一核心用户"
}

function fallbackBrief(prompt: string): BriefContent {
  const productName = fallbackProductName(prompt)
  return {
    productName,
    tagline: prompt.trim().slice(0, 80) || `验证 ${productName} 的真实需求`,
    audience: fallbackAudience(prompt),
    painPoints: ["核心使用场景和问题强度仍需访谈确认", "当前替代方案和切换成本尚未验证", "购买时机与支付意愿需要真实测试"],
    sellingPoints: ["围绕一个明确场景收敛首发版本", "将核心价值设计为可连续演示的体验", "控制功能范围以降低首次交付复杂度"],
    form: prompt.trim().slice(0, 160) || productName,
    retailPrice: 299,
    earlyBirdPrice: 219,
    risks: ["产品定义仍需用户验证", "制造成本和供应链尚未确认", "认证、运费与交付周期尚未测算"],
    heroImage: null,
  }
}

export async function generateBriefFromPrompt(prompt: string): Promise<BriefContent> {
  const fallback = fallbackBrief(prompt)
  if (!serverEnv.MIMO_API_KEY) return fallback
  try {
    const { text } = await generateText({
      model: mimo(serverEnv.MIMO_DESIGN_MODEL),
      system: `你是物理产品众筹立项编辑器。把用户原始描述整理成 Product Brief JSON。
只允许根据输入做合理收敛，不得虚构市场规模、认证、测试结果、供应商或用户反馈。
价格是用于验证的人民币目标价，不是已验证事实。只输出 JSON。`,
      prompt: `用户描述：${prompt}\n\n返回字段：productName, tagline, audience, painPoints(3-5), sellingPoints(3-5), form, retailPrice, earlyBirdPrice, risks(3-5)。`,
    })
    const parsed = briefSchema.parse(JSON.parse(cleanJson(text)))
    return { ...parsed, heroImage: null }
  } catch {
    return fallback
  }
}

export function generateValidationFromFoundation(foundation: CampaignFoundationContent): ValidationContent {
  return {
    methods: [
      { key: "email", label: "收集邮箱", enabled: true },
      { key: "earlybird", label: "预约档位（不收费）", enabled: true },
      { key: "prototype", label: "原型体验申请", enabled: foundation.delivery.productStage !== "concept" },
      { key: "payment", label: "正式收款", enabled: false },
    ],
    launchPlan: [
      { date: "T-21 天", event: "补齐上线前证据并开放非绑定预约" },
      { date: "T-7 天", event: "发布原型、制造与风险更新" },
      { date: "T 日", event: foundation.readiness.publicationMode === "live" ? "发布正式众筹页面" : "发布概念验证页面" },
      { date: "T+7 天", event: "复盘渠道、档位和预约转化" },
    ],
    checklist: [
      "Campaign Foundation 已批准",
      "价格、档位和不收费语义一致",
      "所有公开声明均有状态和证据边界",
      "履约风险、运费和交付周期已复核",
    ],
  }
}
