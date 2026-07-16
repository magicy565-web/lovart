"use client"

import { useEffect, useState } from "react"
import { makeAssistantToolUI } from "@assistant-ui/react"
import { CaretRightIcon, CircleNotchIcon, FileTextIcon } from "@phosphor-icons/react"
import { useCanvasStore } from "@/lib/canvas-store"
import { useProcessStore } from "@/lib/studio/process-store"
import type { BriefData } from "@/lib/studio/process-types"

type Result = { brief: BriefData; heroImage: string | null; heroError: string | null; createdAt: string; persistenceError?: string }

function BriefToolView({ result, toolCallId }: { result?: Result; toolCallId: string }) {
  const [isStalled, setIsStalled] = useState(false)
  const addImage = useCanvasStore((state) => state.addImage)
  const addBrief = useCanvasStore((state) => state.addBrief)
  const setBrief = useProcessStore((state) => state.setBrief)
  useEffect(() => { if(result)return; const timer=window.setTimeout(()=>setIsStalled(true),45_000); return()=>window.clearTimeout(timer) }, [result])
  useEffect(() => { if(!result?.brief)return; setBrief(toolCallId,result.brief); addBrief(toolCallId,`${result.brief.productName} · Brief`,result.brief); if(result.heroImage)addImage(`${toolCallId}-hero`,result.heroImage,`${result.brief.productName} · 主图`); window.dispatchEvent(new CustomEvent("studio:brief-created",{detail:{title:result.brief.productName}})) }, [addBrief,addImage,result,setBrief,toolCallId])
  if(!result)return <div className="my-2.5 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"><CircleNotchIcon className="size-4 animate-spin" /><div><p className="text-xs font-medium">{isStalled?"本次摘要未能完成":"正在整理内部 Brief"}</p><p className="text-[10px] text-muted-foreground">{isStalled?"请重新发送一次。":"生成结构化产品上下文…"}</p></div></div>
  const {brief}=result
  return (
    <details className="group my-2.5 overflow-hidden rounded-xl border border-border/60 bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 marker:content-none"><FileTextIcon className="size-4" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">内部摘要 · {brief.productName}</span><span className="text-[10px] text-muted-foreground">Product Brief</span><CaretRightIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" /></summary>
      <div className="border-t border-border/50 px-3 py-3 text-xs">
        <p className="text-muted-foreground">{brief.tagline}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2.5"><div><p className="text-[9px] text-muted-foreground">零售价</p><p className="font-semibold">¥{brief.retailPrice}</p></div><div><p className="text-[9px] text-muted-foreground">早鸟价</p><p className="font-semibold">¥{brief.earlyBirdPrice}</p></div><div><p className="text-[9px] text-muted-foreground">目标用户</p><p className="truncate font-medium">{brief.audience}</p></div></div>
        <div className="mt-3 grid gap-1.5">{brief.tasks.map((task,index)=><div key={task.title} className="flex gap-2 border-b border-dashed border-border/50 py-1.5 last:border-0"><span className="font-mono text-[9px] text-muted-foreground">{String(index+1).padStart(2,"0")}</span><span className="font-medium">{task.title}</span><span className="ml-auto truncate text-[10px] text-muted-foreground">{task.note}</span></div>)}</div>
        {result.persistenceError && <p className="mt-2 text-[10px] text-destructive">Artifact 保存失败：{result.persistenceError}</p>}
        <p className="mt-2 text-[10px] text-muted-foreground">Product Brief 已添加到画布；确认定义后才能运行竞品设计强化。</p>
      </div>
    </details>
  )
}

export const CreateBriefToolUI = makeAssistantToolUI<BriefData, Result>({ toolName:"createProductBrief", render:({result,toolCallId})=><BriefToolView result={result} toolCallId={toolCallId}/> })
