'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircleIcon, CircleNotchIcon, CloudSlashIcon, WarningCircleIcon } from "@phosphor-icons/react"
import useSWR from "swr"

import type { CanvasItem } from "@/lib/canvas-store"
import { useCanvasStore } from "@/lib/canvas-store"

type CanvasLog = { id: string; label: string; at: number }
type CanvasDocument = { items: CanvasItem[]; logs: CanvasLog[] }
type CanvasResponse = { projectId: string | null; title: string; document: CanvasDocument; version: number; updatedAt: string | null; error?: string }
type LocalCanvas = { title: string; document: CanvasDocument; updatedAt: string }
type SaveState = "loading" | "saved" | "saving" | "local" | "error"

const localKey = (projectId: string) => `lovart:canvas:${projectId}`

function readLocal(projectId: string): LocalCanvas | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey(projectId)) ?? "null") as LocalCanvas | null
    if (!parsed || !Array.isArray(parsed.document?.items) || !Array.isArray(parsed.document?.logs)) return null
    return parsed
  } catch {
    return null
  }
}

function writeLocal(projectId: string, title: string, document: CanvasDocument, updatedAt: string) {
  try {
    localStorage.setItem(localKey(projectId), JSON.stringify({ title, document, updatedAt } satisfies LocalCanvas))
    return true
  } catch {
    return false
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const result = (await response.json()) as CanvasResponse
  if (!response.ok) throw new Error(result.error || "读取画布失败")
  return result
}

export function CanvasPersistence({
  projectId,
  title,
  onHydrateTitle,
}: {
  projectId: string
  title: string
  onHydrateTitle: (title: string) => void
}) {
  const endpoint = `/api/canvas?projectId=${encodeURIComponent(projectId)}`
  const { data, error } = useSWR<CanvasResponse>(endpoint, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false })
  const [status, setStatus] = useState<SaveState>("loading")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef(title)
  const hydrationStarted = useRef(false)

  useEffect(() => {
    titleRef.current = title
  }, [title])

  useEffect(() => {
    useCanvasStore.getState().setProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (hydrationStarted.current || (!data && !error)) return
    hydrationStarted.current = true
    const local = readLocal(projectId)
    const remoteIsEmpty = Boolean(data && data.version === 0 && data.document.items.length === 0)
    const source = local && (!data || remoteIsEmpty) ? local : data
    const document = source?.document ?? { items: [], logs: [] }
    const savedTitle = source?.title?.trim() || "未命名发布企划"
    useCanvasStore.getState().hydrateDocument(document)
    onHydrateTitle(savedTitle)
    setUpdatedAt(source?.updatedAt ?? null)
    setStatus(data ? "saved" : "local")
    setHydrated(true)
    if (data && !remoteIsEmpty) writeLocal(projectId, data.title, data.document, data.updatedAt ?? new Date().toISOString())
  }, [data, error, onHydrateTitle, projectId])

  const save = useCallback(async () => {
    const current = useCanvasStore.getState()
    const document = { items: current.items, logs: current.logs }
    const localUpdatedAt = new Date().toISOString()
    const localSaved = writeLocal(projectId, titleRef.current, document, localUpdatedAt)
    setUpdatedAt(localUpdatedAt)

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: titleRef.current, document }),
      })
      const result = (await response.json()) as { updatedAt?: string; error?: string }
      if (!response.ok) throw new Error(result.error || "保存画布失败")
      setUpdatedAt(result.updatedAt || localUpdatedAt)
      setStatus("saved")
    } catch {
      setStatus(localSaved ? "local" : "error")
    }
  }, [endpoint, projectId])

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setStatus("saving")
    timer.current = setTimeout(() => void save(), 700)
  }, [save])

  useEffect(() => {
    if (!hydrated) return
    const unsubscribe = useCanvasStore.subscribe((state, previous) => {
      if (state.items === previous.items && state.logs === previous.logs) return
      scheduleSave()
    })
    return unsubscribe
  }, [hydrated, scheduleSave])

  useEffect(() => {
    if (!hydrated) return
    const saveTimer = setTimeout(scheduleSave, 0)
    return () => clearTimeout(saveTimer)
  }, [hydrated, scheduleSave, title])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const label = status === "loading"
    ? "正在读取"
    : status === "saving"
      ? "正在保存"
      : status === "local"
        ? "已保存到本地"
        : status === "error"
          ? "保存失败"
          : updatedAt
            ? `已保存 ${new Date(updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
            : "已保存"
  const Icon = status === "error" ? WarningCircleIcon : status === "local" ? CloudSlashIcon : status === "loading" || status === "saving" ? CircleNotchIcon : CheckCircleIcon

  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-black/5 bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
      <Icon size={14} weight={status === "saved" ? "fill" : "regular"} className={status === "loading" || status === "saving" ? "animate-spin" : ""} />
      <span>{label}</span>
    </div>
  )
}
