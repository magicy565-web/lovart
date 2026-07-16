export const EXPLORE_CATEGORIES = [
  "全部",
  "产品",
  "品牌",
  "包装",
  "页面",
  "影片",
  "角色",
  "供应链",
  "海报",
  "插画",
  "UI",
  "建筑",
] as const

export type ExploreCategory = (typeof EXPLORE_CATEGORIES)[number]

export const EXPLORE_STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "wip", label: "推进中" },
  { value: "published", label: "已发布" },
] as const

export const EXPLORE_SORT_OPTIONS = [
  { value: "recommended", label: "推荐" },
  { value: "active", label: "活跃" },
  { value: "latest", label: "最新" },
  { value: "hot", label: "最热" },
  { value: "forked", label: "Fork 最多" },
  { value: "recruiting", label: "正在招募" },
] as const

export const EXPLORE_VIEW_OPTIONS = [
  { value: "feed", label: "灵感流" },
  { value: "activity", label: "正在发生" },
  { value: "lineage", label: "分支地图" },
] as const

export function activityLabel(type: string, metadata: Record<string, unknown> = {}): string {
  switch (type) {
    case "project_published":
      return "将企划分享到灵感发现"
    case "project_forked":
      return `产生了新分支${metadata.title ? `「${metadata.title}」` : ""}`
    case "project_created_from_fork":
      return `Fork 自「${metadata.sourceTitle ?? "原企划"}」`
    case "collaborator_joined":
      return "加入了协作"
    case "collaboration_requested":
      return "申请加入协作"
    case "need_created":
      return `发布了需求「${metadata.title ?? ""}」`
    case "need_claimed":
      return `认领了任务「${metadata.title ?? ""}」`
    case "comment_created":
      return "发表了评论"
    case "stage_completed":
      return "完成了一个阶段"
    case "artifact_created":
      return "生成了新产物"
    default:
      return "更新了企划"
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString("zh-CN")
}
