"use client"

import { useEffect, useRef } from "react"
import { makeAssistantToolUI } from "@assistant-ui/react"
import { CircleNotchIcon, ImageSquareIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { useCanvasStore } from "@/lib/canvas-store"
import { registerGeneratedConceptAsset } from "@/app/actions/evidence"

type GenerateImageArgs = {
  productName: string
  productForm: string
  tagline: string
  audience: string
  prompt: string
  title?: string
}

type GenerateImageResult = {
  url?: string
  error?: string
}

function GenerateImageToolView({
  args,
  result,
  toolCallId,
}: {
  args: GenerateImageArgs
  result: GenerateImageResult | undefined
  toolCallId: string
}) {
  const addImage = useCanvasStore((s) => s.addImage)
  const projectId = useCanvasStore((s) => s.projectId)
  const registered = useRef("")

  useEffect(() => {
    if (result?.url) {
      const lockedPrompt = `${args.productName}｜${args.productForm}｜${args.tagline}｜${args.audience}｜${args.prompt}`
      addImage(toolCallId, result.url, args.title || `${args.productName} · 品牌视觉`, lockedPrompt)
    }
  }, [result?.url, toolCallId, addImage, args.title, args.prompt, args.productName, args.productForm, args.tagline, args.audience])
  useEffect(() => {
    if (!projectId || !result?.url || result.url.startsWith("data:")) return
    const key = `${projectId}:${result.url}`
    if (registered.current === key) return
    registered.current = key
    void registerGeneratedConceptAsset(projectId, {
      url: result.url,
      label: args.title || `${args.productName} · 生成概念`,
      provenance: `${args.productName}｜${args.productForm}｜${args.tagline}｜${args.audience}｜${args.prompt}`,
    }).catch(() => { registered.current = "" })
  }, [args.audience, args.productForm, args.productName, args.prompt, args.tagline, args.title, projectId, result?.url])

  if (result?.error) {
    return (
      <div className="my-2.5 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <WarningCircleIcon className="size-4 shrink-0" />
        <span>图像生成失败: {result.error}</span>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="my-2.5 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <CircleNotchIcon className="size-4 animate-spin" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">正在生成图像…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">通常需要 1–2 分钟，请保持页面开启</p>
          <p className="mt-1 truncate text-xs text-muted-foreground/70">{args.prompt}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      {result.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.url || "/placeholder.svg"}
          alt={args.title || args.prompt}
          className="block max-h-64 w-full object-cover"
          crossOrigin="anonymous"
        />
      )}
      <div className="flex items-center gap-2.5 border-t border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ImageSquareIcon className="size-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground">{args.title || args.prompt}</span>
        <span className="ml-auto shrink-0">已添加到画布</span>
      </div>
    </div>
  )
}

export const GenerateImageToolUI = makeAssistantToolUI<GenerateImageArgs, GenerateImageResult>({
  toolName: "generateImage",
  render: ({ args, result, toolCallId }) => (
    <GenerateImageToolView args={args} result={result} toolCallId={toolCallId} />
  ),
})
