import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { z } from "zod"

import { serverEnv } from "@/lib/config/server"
import { readCanvasDocument, saveCanvasDocument } from "@/features/canvas/server/service"

export const runtime = "nodejs"

const itemSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["image", "video", "text", "frame", "generator", "rectangle", "ellipse", "line", "arrow", "polygon", "star", "drawing", "brief", "research", "competitor-style", "design-reinforcement"]),
  title: z.string().max(240),
  x: z.number().finite(), y: z.number().finite(), width: z.number().positive(), height: z.number().positive(),
  zIndex: z.number().int(),
}).passthrough()
const logSchema = z.object({ id: z.string().min(1).max(120), label: z.string().max(240), at: z.number() })
const documentSchema = z.object({ items: z.array(itemSchema).max(1000), logs: z.array(logSchema).max(500) })
const saveSchema = z.object({ title: z.string().trim().min(1).max(160).default("未命名发布企划"), document: documentSchema })
const projectIdSchema = z.string().uuid()

async function workspaceId() {
  const jar = await cookies()
  const existing = jar.get("canvas_workspace")?.value
  if (existing && z.string().uuid().safeParse(existing).success) return existing
  const created = randomUUID()
  jar.set("canvas_workspace", created, { httpOnly: true, sameSite: "lax", secure: serverEnv.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 })
  return created
}

function projectIdFrom(request: Request) {
  const value = new URL(request.url).searchParams.get("projectId")
  if (!value) return null
  const parsed = projectIdSchema.safeParse(value)
  if (!parsed.success) throw new Error("项目 ID 无效")
  return parsed.data
}

export async function GET(request: Request) {
  try {
    const projectId = projectIdFrom(request)
    const id = projectId ?? (await workspaceId())
    const row = await readCanvasDocument({ workspaceId: id, projectId })
    if (!row) return Response.json({ projectId, title: "未命名发布企划", document: { items: [], logs: [] }, version: 0, updatedAt: null })
    const legacyDocument = row.document as { items?: unknown[]; logs?: unknown[] } | null
    const items = Array.isArray(legacyDocument?.items)
      ? legacyDocument.items.filter((item) => itemSchema.safeParse(item).success)
      : []
    return Response.json({ projectId, title: row.title, document: { items, logs: Array.isArray(legacyDocument?.logs) ? legacyDocument.logs : [] }, version: row.version, updatedAt: row.updated_at })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取画布失败" }, { status: 503 })
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = saveSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: "画布数据格式无效" }, { status: 400 })
    const projectId = projectIdFrom(request)
    const id = projectId ?? (await workspaceId())
    const result = await saveCanvasDocument({ workspaceId: id, projectId, ...parsed.data })
    return Response.json({ saved: true, projectId, version: result.version, updatedAt: result.updated_at })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存画布失败" }, { status: 503 })
  }
}
