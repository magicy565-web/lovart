"use client"

import { useState } from "react"
import { CheckCircleIcon, PencilSimpleIcon, SealCheckIcon } from "@phosphor-icons/react"

import type { CanvasItem } from "@/lib/canvas-store"
import { useCanvasStore } from "@/lib/canvas-store"

export function BriefNode({ item }: { item: CanvasItem }) {
  const confirmBrief = useCanvasStore((state) => state.confirmBrief)
  const reviseBrief = useCanvasStore((state) => state.reviseBrief)
  const [editing, setEditing] = useState(false)
  const brief = item.brief
  if (!brief) return null

  const confirmed = brief.status === "confirmed"
  return (
    <article className="flex size-full flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/35 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-wider text-muted-foreground">PRODUCT BRIEF · V{brief.version}</p>
          <h3 className="mt-1 truncate text-base font-semibold">{brief.productName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{brief.tagline}</p>
        </div>
        <span className={confirmed ? "inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700" : "inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-800"}>
          {confirmed ? <SealCheckIcon className="size-3" weight="fill" /> : null}
          {confirmed ? "CONFIRMED" : "DRAFT"}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs">
        {editing ? (
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground">产品名称<input defaultValue={brief.productName} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" onBlur={(event) => reviseBrief(item.id, { ...brief, productName: event.target.value.trim() || brief.productName })} /></label>
            <label className="block text-[10px] text-muted-foreground">标语<input defaultValue={brief.tagline} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" onBlur={(event) => reviseBrief(item.id, { ...brief, tagline: event.target.value.trim() || brief.tagline })} /></label>
            <label className="block text-[10px] text-muted-foreground">产品形态<textarea defaultValue={brief.form} className="mt-1 min-h-18 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" onBlur={(event) => reviseBrief(item.id, { ...brief, form: event.target.value.trim() || brief.form })} /></label>
          </div>
        ) : (
          <>
            <section><p className="text-[10px] text-muted-foreground">目标用户</p><p className="mt-1 leading-relaxed">{brief.audience}</p></section>
            <section><p className="text-[10px] text-muted-foreground">产品形态</p><p className="mt-1 leading-relaxed">{brief.form}</p></section>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5"><div><p className="text-[10px] text-muted-foreground">零售价</p><p className="mt-0.5 font-semibold">¥{brief.retailPrice}</p></div><div><p className="text-[10px] text-muted-foreground">早鸟价</p><p className="mt-0.5 font-semibold">¥{brief.earlyBirdPrice}</p></div></div>
            <section><p className="text-[10px] text-muted-foreground">核心卖点</p><ul className="mt-1 space-y-1 leading-relaxed">{brief.sellingPoints.map((point) => <li key={point}>• {point}</li>)}</ul></section>
            {confirmed ? <p className="rounded-md bg-emerald-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-800">已锁定产品身份与版本。编辑后会返回 Draft，并使同产品的下游设计强化产物失效。</p> : <p className="rounded-md bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">确认后才可基于此版本运行 TikTok 竞品设计强化。</p>}
          </>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border bg-muted/20 px-4 py-3">
        <button type="button" className="nodrag flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" onClick={() => setEditing((value) => !value)}><PencilSimpleIcon className="size-3.5" />{editing ? "完成编辑" : "编辑"}</button>
        {!confirmed ? <button type="button" className="nodrag ml-auto flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-90" onClick={() => confirmBrief(item.id)}><CheckCircleIcon className="size-3.5" weight="fill" />确认定义</button> : null}
      </footer>
    </article>
  )
}
