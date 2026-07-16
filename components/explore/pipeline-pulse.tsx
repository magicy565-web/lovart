"use client"

import { EXPLORE_STAGE_LABELS } from "@/lib/explore/pipeline"
import { cn } from "@/lib/utils"

interface PipelinePulseProps {
  currentStage: number // 1–6
  status: "wip" | "published"
  className?: string
  compact?: boolean
}

export function PipelinePulse({ currentStage, status, className, compact = true }: PipelinePulseProps) {
  const isPublished = status === "published"
  const label = isPublished
    ? "已完成全部阶段"
    : `项目进度：当前处于${EXPLORE_STAGE_LABELS[currentStage - 1] ?? ""}阶段，第 ${currentStage}/6 步`

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="meter"
      aria-label={label}
      aria-valuenow={isPublished ? 6 : currentStage}
      aria-valuemin={1}
      aria-valuemax={6}
    >
      {EXPLORE_STAGE_LABELS.map((stageLabel, i) => {
        const seq = i + 1
        const isDone = isPublished || seq < currentStage
        const isActive = !isPublished && seq === currentStage
        const isPending = !isPublished && seq > currentStage
        return (
          <span
            key={stageLabel}
            title={stageLabel}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-500",
              isDone && "bg-foreground/60",
              isActive && "bg-flame animate-pulse motion-reduce:animate-none",
              isPending && "bg-foreground/15",
              !compact && "h-1.5",
            )}
          />
        )
      })}
    </div>
  )
}

interface PipelineExpandedProps {
  currentStage: number
  status: "wip" | "published"
  className?: string
}

export function PipelineExpanded({ currentStage, status, className }: PipelineExpandedProps) {
  const isPublished = status === "published"
  return (
    <ol className={cn("space-y-3", className)}>
      {EXPLORE_STAGE_LABELS.map((stageLabel, i) => {
        const seq = i + 1
        const isDone = isPublished || seq < currentStage
        const isActive = !isPublished && seq === currentStage
        return (
          <li key={stageLabel} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-1 size-2.5 shrink-0 rounded-full",
                isDone && "bg-foreground/70",
                isActive && "bg-flame animate-pulse motion-reduce:animate-none",
                !isDone && !isActive && "border border-foreground/25 bg-transparent",
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-foreground/80")}>
                {stageLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDone ? "已完成" : isActive ? "正在进行" : "尚未开始"}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
