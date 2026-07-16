import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

import { serverEnv } from "@/lib/config/server"

export const maxDuration = 120

const mimo = createOpenAICompatible({
  name: "mimo",
  baseURL: serverEnv.MIMO_BASE_URL,
  apiKey: serverEnv.MIMO_API_KEY,
})

// 对话修改:接收 Artifact 内容 JSON 与修改指令,返回修改后的 JSON。
// Mock 生成流程可替换;此处已接真实模型,失败时优雅降级为原内容。
export async function POST(req: Request) {
  const { content, instruction, artifactType } = (await req.json()) as {
    content: unknown
    instruction: string
    artifactType: string
  }

  if (!serverEnv.MIMO_API_KEY) {
    return Response.json({ content, note: "未配置模型密钥,已保留原内容并记录修改请求" })
  }

  try {
    const { text } = await generateText({
      model: mimo("mimo-v2.5-pro"),
      system: `你是众筹企划编辑器。用户会给你一个 JSON 对象(类型: ${artifactType})和一条中文修改指令。
请根据指令修改 JSON 中的文字内容,保持 JSON 结构、字段名和字段类型完全不变(数组长度可以变化)。
不要修改图片路径(src 字段)。价格字段保持为数字。
只输出修改后的 JSON,不要任何解释、注释或 markdown 代码块。`,
      prompt: `JSON 内容:\n${JSON.stringify(content, null, 2)}\n\n修改指令:${instruction}`,
    })

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
    const parsed = JSON.parse(cleaned)
    return Response.json({ content: parsed })
  } catch (error) {
    console.error("[v0] edit api error:", error)
    return Response.json({ content, note: "修改解析失败,已保留原内容" }, { status: 200 })
  }
}
