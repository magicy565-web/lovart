"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CircleIcon,
  CircleNotchIcon,
  LockSimpleIcon,
  PackageIcon,
  PlayIcon,
  RocketLaunchIcon,
  WarningCircleIcon,
  CompassIcon,
  ArchiveBoxIcon,
  CopySimpleIcon,
} from "@phosphor-icons/react"
import { initializeProjectPipeline, publishProject, syncCanvasArtifact, unpublishProject } from "@/app/actions/studio"
import { Button } from "@/components/ui/button"
import { CampaignDecisionRoom } from "@/components/studio/campaign-decision-room"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ALL_PIPELINE_STAGES, PIPELINE_STAGES, pipelineProgress } from "@/lib/studio/artifact-pipeline"
import { currentContentOf, SIGNAL_METRIC_LABELS, useIntentLeads, useProject, useSignalCounts } from "@/features/studio/client/use-project"
import type { ArtifactContent, ArtifactStatus, ArtifactType, CampaignFoundationContent } from "@/lib/studio/types"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<ArtifactStatus, string> = {
  locked: "等待上游",
  ready: "可生成",
  generating: "生成中",
  review: "待确认",
  approved: "已批准",
  failed: "生成失败",
  stale: "需要更新",
}

function StatusIcon({ status }: { status: ArtifactStatus }) {
  if (status === "approved") return <CheckCircleIcon className="size-4 text-emerald-600" weight="fill" />
  if (status === "generating") return <CircleNotchIcon className="size-4 animate-spin text-flame" />
  if (status === "locked") return <LockSimpleIcon className="size-4 text-muted-foreground/50" />
  if (status === "failed" || status === "stale") return <WarningCircleIcon className="size-4 text-amber-600" />
  return <CircleIcon className={cn("size-4", status === "review" ? "text-flame" : "text-muted-foreground")} />
}

function contentSummary(type: ArtifactType, content: ArtifactContent | null) {
  if (!content) return "尚未生成内容"
  if (type === "brief" && "productName" in content) return `${content.productName} · ${content.tagline}`
  if (type === "research" && "opportunity" in content) return content.opportunity
  if (type === "campaign-foundation" && "readiness" in content) return `${content.product.workingName} · ${content.readiness.publicationMode === "live" ? "正式发布" : "概念验证"} · ${content.readiness.score}/100`
  if (type === "visual-system" && "style" in content) return content.style
  if (type === "campaign" && "heroTitle" in content) return content.heroTitle
  if (type === "validation" && "methods" in content) return `${content.methods.filter((item) => item.enabled).length} 项验证方式已启用`
  if (type === "release-package" && "executiveSummary" in content) return content.executiveSummary
  return "已生成结构化内容"
}

export function ArtifactPanel({ projectId, title, initialPrompt }: { projectId: string; title: string; initialPrompt: string }) {
  const { state, mutate, isLoading, error: loadError } = useProject(projectId)
  const published = state?.publication?.status === "active" || state?.project.status === "published"
  const { counts, totalIntent, mutateSignals } = useSignalCounts(projectId, Boolean(published))
  const { leads, mutateLeads } = useIntentLeads(projectId, Boolean(published))
  const [busyType, setBusyType] = useState<ArtifactType | "publish" | "unpublish" | null>(null)
  const [feedback, setFeedback] = useState<Partial<Record<ArtifactType, string>>>({})
  const [actionError, setActionError] = useState("")
  const [decisionRoomOpen, setDecisionRoomOpen] = useState(false)

  useEffect(() => {
    void initializeProjectPipeline(projectId, title, initialPrompt)
      .then(() => mutate())
      .catch((error) => setActionError(error instanceof Error ? error.message : "产物链初始化失败"))
  }, [initialPrompt, mutate, projectId, title])

  async function run(type: ArtifactType, operation: "generate" | "approve" | "revise") {
    const note = feedback[type]?.trim() ?? ""
    if (operation === "revise" && !note) {
      setActionError("请先填写具体修改要求")
      return
    }
    setBusyType(type)
    setActionError("")
    try {
      await syncCanvasArtifact(projectId, type, operation, note)
      if (operation === "revise") setFeedback((current) => ({ ...current, [type]: "" }))
      await mutate()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败，请重试")
    } finally {
      setBusyType(null)
    }
  }

  async function publish() {
    setBusyType("publish")
    setActionError("")
    try {
      const slug = await publishProject(projectId)
      await mutate()
      await mutateSignals()
      await mutateLeads()
      window.open(`/campaign/${slug}`, "_blank", "noopener,noreferrer")
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "发布失败，请重试")
    } finally {
      setBusyType(null)
    }
  }

  async function unpublish() {
    setBusyType("unpublish")
    setActionError("")
    try {
      await unpublishProject(projectId)
      await mutate()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "下架失败，请重试")
    } finally {
      setBusyType(null)
    }
  }

  if (isLoading && !state) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><CircleNotchIcon className="mr-2 size-4 animate-spin" />正在读取产物链</div>
  }

  if (loadError || !state) {
    return <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">无法读取产物链。请确认数据库连接后重试。</div>
  }

  const completed = pipelineProgress(state.artifacts)
  const publication = state.publication?.status === "active" ? state.publication : null
  const readiness = state.publicationReadiness
  const canPublish = Boolean(readiness?.canPublish)
  const publishLabel =
    readiness?.path === "live"
      ? publication
        ? "重新发布正式版"
        : "发布正式验证页"
      : publication
        ? "更新概念验证页"
        : "发布概念验证页"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">商业化产物链</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">每个阶段都需要你的明确批准</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{completed}/{PIPELINE_STAGES.length}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-flame transition-[width]" style={{ width: `${(completed / PIPELINE_STAGES.length) * 100}%` }} />
        </div>
        {readiness && (
          <p className={cn(
            "mt-2 text-[11px] leading-4",
            readiness.canPublish ? "text-emerald-700" : readiness.path === "blocked" ? "text-amber-700" : "text-muted-foreground",
          )}>
            {readiness.summary}
          </p>
        )}
        {published && (
          <div className="mt-2.5 rounded-md border border-border/80 bg-muted/40 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">概念验证信号</p>
              <span className="font-mono text-[10px] text-muted-foreground">
                意向 {totalIntent}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {([
                ["visit", counts.visit],
                ["cta_click", counts.cta_click],
                ["email", counts.email],
                ["earlybird", counts.earlybird],
              ] as const).map(([key, value]) => (
                <div key={key} className="rounded bg-background/80 px-1.5 py-1 text-center">
                  <p className="font-mono text-[11px] font-semibold tabular-nums">{Number(value ?? 0)}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {SIGNAL_METRIC_LABELS[key]}
                  </p>
                </div>
              ))}
            </div>
            {totalIntent === 0 && Number(counts.visit ?? 0) === 0 ? (
              <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                分享链接后，访问与预约会在此实时累计。
              </p>
            ) : totalIntent === 0 ? (
              <p className="mt-1.5 text-[10px] leading-4 text-amber-700/90">
                已有访问，但还没有留资或早鸟预约——可优化 CTA 与价格档位。
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] leading-4 text-emerald-700">
                已有意向信号，可继续补证据或推进正式发布。
              </p>
            )}
            {leads.length > 0 && (
              <div className="mt-2 border-t border-border/60 pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  最近意向（邮箱已脱敏）
                </p>
                <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
                  {leads.slice(0, 8).map((lead) => (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between gap-2 rounded bg-background/70 px-1.5 py-1 text-[10px]"
                    >
                      <span className="min-w-0 truncate font-mono text-foreground/90">
                        {lead.maskedEmail}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {lead.tierName || (lead.kind === "earlybird" ? "早鸟" : "留资")}
                      </span>
                    </li>
                  ))}
                </ul>
                {leads.length > 8 && (
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    另有 {leads.length - 8} 条…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {ALL_PIPELINE_STAGES.map((stage) => {
          const artifact = state.artifacts.find((item) => item.type === stage.type)
          if (!artifact) return null
          const revisions = state.revisions.filter((revision) => revision.artifactId === artifact.id)
          const content = currentContentOf(artifact, state.revisions)
          const busy = busyType === artifact.type
          const canRevise = artifact.status === "review" || artifact.status === "approved"

          return (
            <section key={stage.type} className="border-b border-border px-4 py-3.5 last:border-b-0">
              <div className="flex items-start gap-3">
                <span className="mt-0.5"><StatusIcon status={artifact.status} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-xs font-semibold">{stage.sequence}. {stage.title}</h3>
                    <span className={cn(
                      "ml-auto shrink-0 text-[10px]",
                      artifact.status === "approved" ? "text-emerald-600" : artifact.status === "review" ? "text-flame" : "text-muted-foreground",
                    )}>{STATUS_LABELS[artifact.status]}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{contentSummary(artifact.type, content)}</p>
                  {revisions.length > 0 && <p className="mt-1 font-mono text-[9px] text-muted-foreground/70">v{Math.max(...revisions.map((item) => item.version))}</p>}

                  {artifact.type === "campaign-foundation" && content && "directions" in content && (
                    <Dialog open={decisionRoomOpen} onOpenChange={setDecisionRoomOpen}>
                      <Button variant="outline" size="xs" className="mt-2.5" onClick={() => setDecisionRoomOpen(true)}>
                        <CompassIcon />打开项目定案室
                      </Button>
                      <DialogContent className="studio-light h-[96dvh] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden rounded-lg bg-background p-0 sm:h-[92dvh] sm:w-[96vw] sm:max-w-[1600px]" showCloseButton>
                        <DialogTitle className="sr-only">众筹立项与产品定案</DialogTitle>
                        <DialogDescription className="sr-only">比较候选路线并编辑 Campaign Foundation</DialogDescription>
                        <CampaignDecisionRoom
                          projectId={projectId}
                          content={content as CampaignFoundationContent}
                          signalCounts={counts}
                          intentLeads={leads}
                          onSaved={mutate}
                          onPublished={async () => {
                            await mutate()
                            await mutateSignals()
                            await mutateLeads()
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  {(artifact.status === "ready" || artifact.status === "failed" || artifact.status === "stale") && (
                    <Button size="xs" className="mt-2.5" disabled={busy} onClick={() => void run(artifact.type, "generate")}>
                      {busy ? <CircleNotchIcon className="animate-spin" /> : artifact.type === "release-package" ? <PackageIcon /> : artifact.status === "ready" ? <PlayIcon /> : <ArrowClockwiseIcon />}
                      {artifact.type === "release-package" ? "组装发布包" : artifact.status === "ready" ? "生成当前产物" : "重新生成"}
                    </Button>
                  )}

                  {artifact.status === "review" && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Button size="xs" disabled={busy} onClick={() => void run(artifact.type, "approve")}>
                        {busy ? <CircleNotchIcon className="animate-spin" /> : <CheckCircleIcon weight="fill" />}
                        批准并解锁下一步
                      </Button>
                      {artifact.type === "campaign-foundation" && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={busy || busyType === "publish"}
                          onClick={() => void (async () => {
                            setBusyType(artifact.type)
                            setActionError("")
                            try {
                              await syncCanvasArtifact(projectId, "campaign-foundation", "approve")
                              const slug = await publishProject(projectId)
                              await mutate()
                              window.open(`/campaign/${slug}`, "_blank", "noopener,noreferrer")
                            } catch (error) {
                              setActionError(error instanceof Error ? error.message : "批准并发布失败")
                              await mutate()
                            } finally {
                              setBusyType(null)
                            }
                          })()}
                        >
                          {busyType === "publish" || busy ? <CircleNotchIcon className="animate-spin" /> : <RocketLaunchIcon weight="fill" />}
                          批准并发布概念页
                        </Button>
                      )}
                    </div>
                  )}

                  {canRevise && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <input
                        value={feedback[artifact.type] ?? ""}
                        onChange={(event) => setFeedback((current) => ({ ...current, [artifact.type]: event.target.value }))}
                        placeholder="填写修改要求"
                        aria-label={`${stage.title}修改要求`}
                        className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none focus:border-flame/50"
                      />
                      <Button variant="outline" size="xs" disabled={busy || !feedback[artifact.type]?.trim()} onClick={() => void run(artifact.type, "revise")}>
                        <ArrowClockwiseIcon />重做
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <footer className="shrink-0 border-t border-border p-3">
        {actionError && <p role="alert" className="mb-2 flex items-start gap-1.5 text-[11px] leading-4 text-destructive"><WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />{actionError}</p>}
        {publication && (
          <div className="mb-2 space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" render={<Link href={`/campaign/${state.project.slug}`} target="_blank" />} className="min-w-0 flex-1">
                <ArrowSquareOutIcon />查看公开版 v{publication.version}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="复制公开页链接"
                title="复制公开页链接"
                onClick={() => {
                  const url = `${window.location.origin}/campaign/${state.project.slug}`
                  void navigator.clipboard.writeText(url).then(
                    () => setActionError(""),
                    () => setActionError("复制链接失败，请手动复制地址栏"),
                  )
                }}
              >
                <CopySimpleIcon />
              </Button>
              <Button variant="destructive" size="icon" aria-label="下架公开页" title="下架公开页" disabled={busyType === "unpublish"} onClick={() => void unpublish()}>
                {busyType === "unpublish" ? <CircleNotchIcon className="animate-spin" /> : <ArchiveBoxIcon />}
              </Button>
            </div>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              /campaign/{state.project.slug}
              <span className="ml-1.5 text-muted-foreground/70">
                · {publication.mode === "live" ? "正式" : "概念验证"}
              </span>
            </p>
          </div>
        )}
        {(!publication || readiness?.canPublish) && (
          <Button className="w-full" disabled={!canPublish || busyType === "publish"} onClick={() => void publish()}>
            {busyType === "publish" ? <CircleNotchIcon className="animate-spin" /> : <RocketLaunchIcon weight="fill" />}
            {publishLabel}
          </Button>
        )}
      </footer>
    </div>
  )
}
