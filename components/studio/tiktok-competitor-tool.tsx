"use client"

import { useEffect } from "react"
import { makeAssistantToolUI } from "@assistant-ui/react"
import {
  ArrowRightIcon,
  CheckIcon,
  CircleNotchIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import type { DesignReinforcementArtifact, DesignTargetAsset } from "@/lib/artifacts/design-reinforcement-artifact"
import { useCanvasStore } from "@/lib/canvas-store"

type Args = {
  researchArtifact: {
    researchId: string
    query: string
    topic: string
    designGoal: string
    hypotheses: string[]
  }
  productBrief: {
    productId: string
    status: "confirmed"
    version: number
    confirmedAt: string
    confirmedHash: string
    productName: string
    audience: string
    productForm: string
    painPoints: string[]
    sellingPoints: string[]
    targetPrice?: number
  }
  targetAssets: DesignTargetAsset[]
}

type Result = DesignReinforcementArtifact | { error: string }

function isArtifact(result: Result | undefined): result is DesignReinforcementArtifact {
  return Boolean(result && "artifact_id" in result)
}

function DesignReinforcementToolView({ args, result, toolCallId }: { args?: Args; result?: Result; toolCallId: string }) {
  const addDesignReinforcement = useCanvasStore((state) => state.addDesignReinforcement)
  const selectItems = useCanvasStore((state) => state.selectItems)

  useEffect(() => {
    if (!isArtifact(result)) return
    addDesignReinforcement(toolCallId, `${result.topic} · 设计强化`, result)
  }, [addDesignReinforcement, result, toolCallId])

  if (result && "error" in result) {
    return (
      <div className="my-2.5 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <WarningCircleIcon className="size-4 shrink-0" />
        <span>设计强化失败：{result.error}</span>
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
          <p className="text-sm font-medium">正在编译「{args?.researchArtifact.topic || args?.researchArtifact.query || "TikTok 设计证据"}」</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">Apify Dataset → evidence_id → 视觉特征 → Pattern Library → 三方向</p>
        </div>
      </div>
    )
  }

  return (
    <article className="my-2.5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <header className="flex items-center gap-3 px-4 pb-3 pt-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <SparkleIcon className="size-4" weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight">{result.topic}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {result.evidence_cleaning.accepted_count} 条核心证据 · {result.pattern_library.length} 个模式 · ${result.budget.estimated_actor_usd.toFixed(3)}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700">DIRECTIONS READY</span>
      </header>

      <section className="mx-4 mb-3 rounded-xl bg-muted/45 px-3.5 py-3">
        <p className="text-[10px] font-medium tracking-wider text-muted-foreground">TOP EVIDENCE PATTERNS</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {result.pattern_library.slice(0, 3).map((pattern) => (
            <div key={pattern.pattern_id} className="flex items-center gap-2 text-xs">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-background font-mono text-[9px] font-bold">{pattern.pattern_score}</span>
              <span className="min-w-0 flex-1 truncate">{pattern.name}</span>
              <span className="font-mono text-[9px] text-muted-foreground">{pattern.evidence_ids.length} ev</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mb-3">
        <p className="mb-1.5 text-[10px] font-medium tracking-wider text-muted-foreground">THREE ORIGINAL DIRECTIONS</p>
        <div className="grid grid-cols-3 gap-1.5">
          {result.design_directions.map((direction, index) => (
            <div key={direction.direction_id} className="rounded-xl border border-border/60 bg-card px-2.5 py-2">
              <p className="font-mono text-[8px] uppercase text-muted-foreground">0{index + 1} · {direction.strategy}</p>
              <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug">{direction.name}</p>
            </div>
          ))}
        </div>
      </section>

      {result.evidence_trace.unresolved_gaps.length ? (
        <div className="mx-4 mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          {result.evidence_trace.unresolved_gaps[0]}
        </div>
      ) : null}

      <footer className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckIcon weight="bold" className="size-3.5 text-foreground" />
          已生成证据型 Artifact，尚未调用生图
        </span>
        <button
          type="button"
          onClick={() => selectItems([toolCallId])}
          className="flex items-center gap-1 text-xs font-medium text-foreground transition-opacity hover:opacity-70"
        >
          在画布中查看
          <ArrowRightIcon className="size-3" />
        </button>
      </footer>
    </article>
  )
}

export const TikTokCompetitorToolUI = makeAssistantToolUI<Args, Result>({
  toolName: "buildDesignReinforcement",
  render: ({ args, result, toolCallId }) => <DesignReinforcementToolView args={args} result={result} toolCallId={toolCallId} />,
})
