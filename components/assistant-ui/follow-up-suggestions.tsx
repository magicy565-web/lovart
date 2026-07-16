"use client"

import { ArrowBendDownRightIcon } from "@phosphor-icons/react"
import { useAui, useAuiState } from "@assistant-ui/react"
import { useProcessStore } from "@/lib/studio/process-store"

export function ThreadFollowupSuggestions() {
  const aui = useAui()
  const isRunning = useAuiState((state) => state.thread.isRunning)
  const seeds = useProcessStore((state) => state.productSeeds)
  const briefs = useProcessStore((state) => state.briefs)
  const research = useProcessStore((state) => state.research)
  const latestSeed = Object.values(seeds).at(-1)
  const hasBrief = Object.keys(briefs).length > 0
  const hasResearch = Object.keys(research).length > 0
  if (isRunning || (!latestSeed && !hasBrief && !hasResearch)) return null
  const options = latestSeed && !latestSeed.confirmedDirection
    ? ["比较两个方向的关键取舍", "补充目标用户的真实使用场景", "重新提出两个差异更大的方向"]
    : hasResearch && !hasBrief
      ? ["基于市场证据生成产品 Brief", "总结最值得验证的市场假设", "调整产品定位后再验证"]
      : ["继续完善产品视觉方向", "生成一张产品主图", "检查当前画布还缺少哪些创作成果"]

  return <div className="flex flex-col gap-2 px-1">
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><ArrowBendDownRightIcon size={12} />接下来可以</div>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => <button key={option} type="button" onClick={() => { aui.composer().setText(option); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[aria-label="Message input"]')?.focus()) }} className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-foreground/25 hover:bg-muted">{option}</button>)}
    </div>
  </div>
}
