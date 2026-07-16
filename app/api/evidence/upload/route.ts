import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

import { registerUploadedCampaignEvidence } from "@/features/campaign/server/evidence-service"

export const runtime = "nodejs"

const fieldsSchema = z.object({
  projectId: z.string().uuid(),
  requirementId: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(80),
  truthClass: z.enum(["generated_concept", "cad_render", "prototype_photo", "production_sample", "manufacturing_evidence", "verified_data"]),
  provenance: z.string().trim().max(1_000).default(""),
  notes: z.string().trim().max(1_000).default(""),
})

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "video/mp4": ".mp4", "video/webm": ".webm", "application/pdf": ".pdf",
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const parsed = fieldsSchema.parse(Object.fromEntries([...form.entries()].filter(([key]) => key !== "file")))
    const file = form.get("file")
    if (!(file instanceof File)) return Response.json({ error: "请选择证据文件" }, { status: 400 })
    const extension = mimeExtensions[file.type]
    if (!extension) return Response.json({ error: "仅支持 JPG、PNG、WebP、MP4、WebM 和 PDF" }, { status: 400 })
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "证据文件不能超过 25MB" }, { status: 400 })
    const directory = path.join(process.cwd(), "public", "uploads", "evidence", parsed.projectId)
    await mkdir(directory, { recursive: true })
    const filename = `${randomUUID()}${extension}`
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()))
    const url = `/uploads/evidence/${parsed.projectId}/${filename}`
    const mediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document"
    const row = await registerUploadedCampaignEvidence(parsed.projectId, { ...parsed, mediaType, url })
    return Response.json({ evidence: row })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 400 })
  }
}
