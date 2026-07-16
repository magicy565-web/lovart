import { PIPELINE_STAGES } from "@/lib/studio/artifact-pipeline"

/** Explore 展示用六阶段（与 Studio 主流水线对齐，不含 release-package） */
export const EXPLORE_PIPELINE_STAGES = PIPELINE_STAGES.map((stage) => ({
  sequence: stage.sequence,
  type: stage.type,
  shortTitle: stage.shortTitle,
  title: stage.title,
  zh: stage.shortTitle,
}))

export const EXPLORE_STAGE_LABELS = EXPLORE_PIPELINE_STAGES.map((s) => s.shortTitle)

export type ExplorePipelineStageKey =
  | "brief"
  | "research"
  | "campaign-foundation"
  | "visual-system"
  | "campaign"
  | "validation"

export function stageKeyFromSequence(sequence: number): ExplorePipelineStageKey {
  const stage = EXPLORE_PIPELINE_STAGES.find((item) => item.sequence === sequence)
  return (stage?.type ?? "brief") as ExplorePipelineStageKey
}

export function sequenceFromStageKey(type: string): number {
  const stage = EXPLORE_PIPELINE_STAGES.find((item) => item.type === type)
  return stage?.sequence ?? 1
}

export function activeSummaryFromStage(sequence: number, status: "wip" | "published"): string {
  if (status === "published") return "已完成发布，可继续 Fork 或复用"
  const stage = EXPLORE_PIPELINE_STAGES.find((item) => item.sequence === sequence)
  return stage ? `正在推进：${stage.title}` : "正在推进产品企划"
}

export function nextMilestoneFromStage(sequence: number, status: "wip" | "published"): string {
  if (status === "published") return "持续迭代与验证"
  const next = EXPLORE_PIPELINE_STAGES.find((item) => item.sequence === sequence + 1)
  return next ? `下一步：完成${next.shortTitle}` : "下一步：准备发布"
}
