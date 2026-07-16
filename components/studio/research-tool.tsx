"use client"

import { useEffect } from "react"
import { makeAssistantToolUI } from "@assistant-ui/react"
import { CaretRightIcon, ChartLineUpIcon, CircleNotchIcon, LinkSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { useProcessStore } from "@/lib/studio/process-store"
import type { ResearchData } from "@/lib/studio/process-types"

type Args = { query: string; topic: string; evidenceId?: string; parentId?: string }
type Content = { summary: string; marketSize: string; competitors: Array<{ name: string; price: string; note: string }>; trends: string[]; opportunity: string }
type Result = { content?: Content; sources?: Array<{ title: string; url: string }>; error?: string; persistenceError?: string; evidenceId?: string; parentId?: string }

function ResearchToolView({ args, result, toolCallId }: { args?: Args; result?: Result; toolCallId: string }) {
  const setResearch = useProcessStore((state) => state.setResearch)
  const setMarketEvidence = useProcessStore((state) => state.setMarketEvidence)
  const topic = args?.topic || "市场调研"

  useEffect(() => {
    const evidenceId = result?.evidenceId ?? args?.evidenceId
    const parentId = result?.parentId ?? args?.parentId ?? ""
    if (result?.error && evidenceId) { const current=useProcessStore.getState().marketEvidence[evidenceId]; if(current)setMarketEvidence(evidenceId,{...current,status:"error",error:result.error}); return }
    if (!result?.content) return
    const research: ResearchData = { topic, ...result.content, sources: result.sources ?? [] }
    setResearch(toolCallId, research)
    if (evidenceId) { const current=useProcessStore.getState().marketEvidence[evidenceId]; if(current)setMarketEvidence(evidenceId,{...current,parentId:parentId||current.parentId,status:"done",research,error:undefined}) }
  }, [args?.evidenceId, args?.parentId, result, setMarketEvidence, setResearch, toolCallId, topic])
  if (result?.error) return <div className="my-2.5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"><WarningCircleIcon className="size-4" /><span>内部市场验证失败：{result.error}</span></div>
  if (!result) return <div className="my-2.5 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"><CircleNotchIcon className="size-4 animate-spin" /><div><p className="text-xs font-medium">正在验证市场证据</p><p className="text-[10px] text-muted-foreground">检索真实竞品、价格与趋势…</p></div></div>
  if (!result.content) return null
  const content=result.content, sources=result.sources??[]

  return (
    <details open className="group my-2.5 overflow-hidden rounded-xl border border-border/60 bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 marker:content-none">
        <ChartLineUpIcon className="size-4" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">内部摘要 · {topic}</span><span className="text-[10px] text-muted-foreground">{sources.length} 个来源</span><CaretRightIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border/50 px-3 py-3 text-xs">
        <p className="leading-relaxed text-muted-foreground">{content.summary}</p>
        <div className="mt-3 rounded-lg bg-muted/50 p-2.5"><p className="font-mono text-[9px] tracking-wider text-muted-foreground">市场规模</p><p className="mt-1 leading-relaxed">{content.marketSize}</p></div>
        <div className="mt-3 grid gap-1.5">{content.competitors.slice(0,4).map((item)=><div key={item.name} className="flex items-center gap-2 border-b border-dashed border-border/50 py-1.5 last:border-0"><span className="min-w-0 flex-1 truncate font-medium">{item.name}</span><span className="font-mono text-[10px]">{item.price}</span></div>)}</div>
        {result.persistenceError && <p className="mt-2 text-[10px] text-destructive">Artifact 保存失败：{result.persistenceError}</p>}
        {sources.length>0&&<div className="mt-3 border-t border-border/50 pt-2"><p className="mb-1.5 text-[10px] text-muted-foreground">真实来源</p>{sources.slice(0,6).map((source)=><a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 py-1 text-[11px] hover:underline"><LinkSimpleIcon className="size-3" /><span className="truncate">{source.title}</span></a>)}</div>}
      </div>
    </details>
  )
}

export const ResearchMarketToolUI = makeAssistantToolUI<Args, Result>({ toolName: "researchMarket", render: ({ args, result, toolCallId }) => <ResearchToolView args={args} result={result} toolCallId={toolCallId} /> })
