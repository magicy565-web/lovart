import { z } from "zod"

import { serverEnv } from "@/lib/config/server"

export const maxDuration = 300

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  ratio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16"]).default("1:1"),
  quality: z.enum(["low", "medium", "high", "1K", "2K", "4K"]).default("1K"),
  count: z.number().int().min(1).max(4).default(1),
  referenceImage: z.string().optional(),
})

const sizes: Record<string, string> = { "1:1": "1024x1024", "4:3": "1536x1024", "3:4": "1024x1536", "16:9": "1536x1024", "9:16": "1024x1536" }
const base = () => serverEnv.KUAIPAO_BASE_URL.replace(/\/$/, "")
const model = (quality: string) => (quality === "2K" || quality === "4K" ? "gpt-image-2" : "gpt-image-2-1k")

async function fetchReferenceBlob(reference: string): Promise<Blob | null> {
  try {
    if (reference.startsWith("data:")) {
      const [meta, b64] = reference.split(",")
      const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png"
      return new Blob([Buffer.from(b64, "base64")], { type: mime })
    }
    const res = await fetch(reference, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

async function requestImage(input: z.infer<typeof requestSchema>) {
  // 有参考图时走 images/edits 实现图生图
  if (input.referenceImage) {
    const blob = await fetchReferenceBlob(input.referenceImage)
    if (blob) {
      const form = new FormData()
      form.set("model", model(input.quality))
      form.set("prompt", input.prompt)
      form.set("size", sizes[input.ratio])
      form.set("n", String(input.count))
      form.set("response_format", "url")
      form.set("image", blob, "reference.png")
      return fetch(`${base()}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serverEnv.KUAIPAO_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(150_000),
      })
    }
  }
  return fetch(`${base()}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.KUAIPAO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: model(input.quality), prompt: input.prompt, size: sizes[input.ratio], n: input.count, response_format: "url" }),
    signal: AbortSignal.timeout(240_000),
  })
}

export async function POST(request: Request) {
  if (!serverEnv.KUAIPAO_API_KEY) {
    return Response.json({ error: "尚未配置 KUAIPAO_API_KEY" }, { status: 503 })
  }

  const parsed = requestSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: "请输入更完整的图像描述" }, { status: 400 })

  try {
    let response = await requestImage(parsed.data)
    // 服务不支持图生图时回退到纯文生图，保证 Remix 一定有产出
    if (!response.ok && parsed.data.referenceImage) response = await requestImage({ ...parsed.data, referenceImage: undefined })
    if (!response.ok) return Response.json({ error: `生图服务返回 ${response.status}` }, { status: response.status })

    const data = (await response.json()) as { data?: Array<{ url?: string; b64_json?: string }>; images?: Array<{ url?: string; b64_json?: string }> }
    const images = data.data ?? data.images ?? []
    const urls = images.map((image) => image.url ?? (image.b64_json ? `data:image/png;base64,${image.b64_json}` : undefined)).filter((url): url is string => Boolean(url))
    if (!urls.length) return Response.json({ error: "生图服务未返回图像" }, { status: 502 })
    return Response.json({ url: urls[0], urls })
  } catch (error) {
    const message = error instanceof Error ? error.message : "图像生成失败"
    return Response.json({ error: message }, { status: 500 })
  }
}
