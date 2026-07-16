import type { ArtifactStatus, ArtifactType, StudioArtifact } from "./types"

export interface PipelineStage {
  sequence: number
  type: ArtifactType
  title: string
  shortTitle: string
  description: string
  agentNote: string
  dependsOn: ArtifactType | null
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { sequence: 1, type: "brief", title: "产品 Brief", shortTitle: "Brief", description: "明确产品定位、目标用户、核心卖点、价格和风险。", agentNote: "整理产品定位、用户问题、卖点与商业约束。", dependsOn: null },
  { sequence: 2, type: "research", title: "市场与受众洞察", shortTitle: "洞察", description: "验证受众需求、竞品格局、趋势与市场机会。", agentNote: "基于已批准 Brief 研究市场、受众与竞品。", dependsOn: "brief" },
  { sequence: 3, type: "campaign-foundation", title: "众筹立项与产品定案", shortTitle: "定案", description: "比较候选路线，锁定产品、用户、故事、Offer、证据与交付边界。", agentNote: "从研究证据生成三条路线，并合成唯一的 Campaign Foundation。", dependsOn: "research" },
  { sequence: 4, type: "visual-system", title: "视觉系统", shortTitle: "视觉", description: "基于已锁定的 Campaign Foundation 建立视觉语言与核心素材。", agentNote: "把已批准的产品定案转化为可执行的视觉系统。", dependsOn: "campaign-foundation" },
  { sequence: 5, type: "campaign", title: "众筹页面", shortTitle: "页面", description: "组合 Hero、故事、功能、档位、时间线与 FAQ。", agentNote: "严格依据已批准的 Campaign Foundation 和视觉系统搭建页面。", dependsOn: "visual-system" },
  { sequence: 6, type: "validation", title: "验证与发布计划", shortTitle: "发布", description: "定义验证方式、发布节奏和上线检查清单。", agentNote: "制定可衡量的验证方案与发布执行计划。", dependsOn: "campaign" },
]

export const RELEASE_STAGE: PipelineStage = {
  sequence: 7,
  type: "release-package",
  title: "可发布项目包",
  shortTitle: "发布包",
  description: "组合六项已批准 Artifact，并记录每项来源版本。",
  agentNote: "组装最终发布包并校验来源版本。",
  dependsOn: "validation",
}

export const ALL_PIPELINE_STAGES = [...PIPELINE_STAGES, RELEASE_STAGE]

export function normalizeArtifactType(type: string): ArtifactType {
  return type === "visuals" ? "visual-system" : (type as ArtifactType)
}

export function normalizeArtifactStatus(status: string, sequence: number): ArtifactStatus {
  if (status === "pending") return sequence === 1 ? "ready" : "locked"
  if (["locked", "ready", "generating", "review", "approved", "failed", "stale"].includes(status)) {
    return status as ArtifactStatus
  }
  return "locked"
}

export function stageFor(type: string) {
  const normalized = normalizeArtifactType(type)
  return ALL_PIPELINE_STAGES.find((stage) => stage.type === normalized)
}

export function getCurrentStage(artifacts: Pick<StudioArtifact, "type" | "status" | "sortOrder">[]) {
  return PIPELINE_STAGES.find((stage) => {
    const artifact = artifacts.find((item) => normalizeArtifactType(item.type) === stage.type)
    return artifact && artifact.status !== "approved"
  }) ?? RELEASE_STAGE
}

export function canAssembleRelease(artifacts: Pick<StudioArtifact, "type" | "status">[]) {
  return PIPELINE_STAGES.every((stage) =>
    artifacts.some((artifact) => normalizeArtifactType(artifact.type) === stage.type && artifact.status === "approved"),
  )
}

export function pipelineProgress(artifacts: Pick<StudioArtifact, "type" | "status">[]) {
  return PIPELINE_STAGES.filter((stage) =>
    artifacts.some((artifact) => normalizeArtifactType(artifact.type) === stage.type && artifact.status === "approved"),
  ).length
}
