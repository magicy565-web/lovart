"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  ArrowLeft,
  BookmarkSimple,
  ChatCircle,
  GitFork,
  Heart,
  UsersThree,
} from "@phosphor-icons/react"

import {
  addProjectComment,
  claimProjectNeed,
  likeProject,
  requestCollaboration,
  saveProject,
  unlikeProject,
  unsaveProject,
} from "@/app/actions/explore"
import type { ExploreProjectDetail } from "@/features/explore/contracts"
import { activityLabel, relativeTime } from "@/lib/explore/categories"
import { cn } from "@/lib/utils"

import { ForkDialog } from "./fork-dialog"
import { PipelineExpanded, PipelinePulse } from "./pipeline-pulse"

interface ProjectLivePageProps {
  detail: ExploreProjectDetail
}

type TabKey = "overview" | "nodes" | "activity" | "needs" | "collaborators" | "comments"

export function ProjectLivePage({ detail }: ProjectLivePageProps) {
  const [tab, setTab] = useState<TabKey>("overview")
  const [liked, setLiked] = useState(detail.project.viewerState.isLiked)
  const [saved, setSaved] = useState(detail.project.viewerState.isSaved)
  const [likeCount, setLikeCount] = useState(detail.project.metrics.likeCount)
  const [forkOpen, setForkOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    detail.nodes.find((n) => n.status === "active")?.id ?? detail.nodes[0]?.id ?? null,
  )
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState(detail.comments)
  const [needs, setNeeds] = useState(detail.needs)
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const selectedNode = useMemo(
    () => detail.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [detail.nodes, selectedNodeId],
  )

  const stageNodes = detail.nodes
    .filter((n) => n.type === "pipeline_stage" || n.type === "project_origin")
    .sort((a, b) => a.sortOrder - b.sortOrder)

  function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)))
    startTransition(async () => {
      try {
        if (next) await likeProject(detail.project.projectId)
        else await unlikeProject(detail.project.projectId)
      } catch {
        setLiked(!next)
        setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)))
        setMessage("请先登录后再点赞")
      }
    })
  }

  function toggleSave() {
    const next = !saved
    setSaved(next)
    startTransition(async () => {
      try {
        if (next) await saveProject(detail.project.projectId)
        else await unsaveProject(detail.project.projectId)
      } catch {
        setSaved(!next)
        setMessage("请先登录后再收藏")
      }
    })
  }

  function handleJoin() {
    startTransition(async () => {
      try {
        const result = await requestCollaboration({
          projectId: detail.project.projectId,
          message: "希望参与这个企划",
        })
        setMessage(result.status === "approved" ? "已加入协作" : "申请已提交，等待负责人确认")
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "申请失败")
      }
    })
  }

  function handleClaim(needId: string) {
    startTransition(async () => {
      try {
        await claimProjectNeed(detail.project.projectId, needId)
        setNeeds((prev) =>
          prev.map((need) =>
            need.id === needId
              ? {
                  ...need,
                  claimedCount: need.claimedCount + 1,
                  remaining: Math.max(0, need.remaining - 1),
                  viewerClaimed: true,
                }
              : need,
          ),
        )
        setMessage("已认领任务")
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "认领失败")
      }
    })
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    const body = comment.trim()
    setComment("")
    startTransition(async () => {
      try {
        const created = await addProjectComment(detail.project.projectId, body)
        setComments((prev) => [
          {
            id: created.id,
            projectId: created.projectId,
            body: created.body,
            createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : String(created.createdAt),
            author: {
              id: "me",
              name: "我",
              avatar: null,
            },
          },
          ...prev,
        ])
      } catch {
        setMessage("请先登录后再评论")
        setComment(body)
      }
    })
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "概览" },
    { key: "nodes", label: "节点" },
    { key: "activity", label: "活动" },
    { key: "needs", label: "任务" },
    { key: "collaborators", label: "协作者" },
    { key: "comments", label: "评论" },
  ]

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            灵感发现
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-base font-semibold">{detail.project.title}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSave}
              aria-label={saved ? "取消收藏" : "收藏"}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
                saved ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary",
              )}
            >
              <BookmarkSimple weight={saved ? "fill" : "regular"} className="size-3.5" />
              <span className="hidden sm:inline">{saved ? "已收藏" : "收藏"}</span>
            </button>
            {detail.project.permissions.allowFork && (
              <button
                type="button"
                onClick={() => setForkOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
              >
                <GitFork className="size-3.5" />
                Fork
              </button>
            )}
            {detail.project.viewerState.relation === "none" &&
              detail.publication.collaborationMode !== "closed" && (
                <button
                  type="button"
                  onClick={handleJoin}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <UsersThree className="size-3.5" />
                  申请加入
                </button>
              )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[1fr_360px]">
        {/* Live canvas / timeline */}
        <section className="min-w-0">
          {detail.sourceProject && (
            <div className="mb-4 rounded-2xl border border-border/70 bg-card px-4 py-3 text-xs">
              Fork 自「
              <Link href={`/explore/${detail.sourceProject.id}`} className="font-medium text-flame hover:underline">
                {detail.sourceProject.title}
              </Link>
              」· 查看原企划
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_55%)] p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">企划现场</p>
                  <p className="mt-1 text-sm text-foreground/80">{detail.project.activeSummary}</p>
                </div>
                <PipelinePulse
                  currentStage={detail.project.pipeline.currentStage}
                  status={detail.project.status}
                  className="w-40"
                />
              </div>

              <div className="relative mx-auto flex max-w-md flex-col items-center">
                {stageNodes.map((node, index) => {
                  const isSelected = node.id === selectedNodeId
                  const isActive = node.status === "active"
                  const isDone = node.status === "completed"
                  return (
                    <div key={node.id} className="flex w-full flex-col items-center">
                      {index > 0 && (
                        <div
                          className={cn(
                            "h-8 w-px",
                            isDone || isActive ? "bg-foreground/35" : "bg-border border-dashed",
                          )}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id)
                          setTab("nodes")
                        }}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-flame/50 bg-flame/10 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
                            : "border-border bg-background/60 hover:bg-secondary/50",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 rounded-full",
                              isDone && "bg-foreground/70",
                              isActive && "bg-flame animate-pulse motion-reduce:animate-none",
                              !isDone && !isActive && "border border-foreground/25",
                            )}
                          />
                          <p className="text-sm font-medium">{node.title}</p>
                          {node.forkable && node.type !== "project_origin" && (
                            <span className="ml-auto text-[10px] text-muted-foreground">可 Fork</span>
                          )}
                        </div>
                        {node.summary && (
                          <p className="mt-1 pl-4 text-[11px] text-muted-foreground">{node.summary}</p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {detail.childForks.length > 0 && (
                <div className="mt-8">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">公开分支</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.childForks.map((fork) => (
                      <Link
                        key={fork.id}
                        href={`/explore/${fork.id}`}
                        className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[11px] hover:bg-secondary"
                      >
                        {fork.title}
                        {fork.creator ? ` · @${fork.creator.name}` : ""}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Inspector */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-4">
            {detail.project.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.project.coverImage}
                alt=""
                className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="mb-3 flex aspect-[4/3] items-center justify-center rounded-2xl bg-secondary font-serif text-4xl text-muted-foreground/30">
                {detail.project.title[0]}
              </div>
            )}
            <h2 className="font-serif text-xl font-semibold leading-snug">{detail.project.title}</h2>
            {detail.project.summary && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail.project.summary}</p>
            )}
            <p className="mt-3 text-xs text-foreground/80">{detail.project.activeSummary}</p>
            {detail.project.nextMilestone && (
              <p className="mt-1 text-[11px] text-muted-foreground">{detail.project.nextMilestone}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {detail.project.creator && (
                <span className="font-serif text-foreground/80">@{detail.project.creator.name}</span>
              )}
              <button type="button" onClick={toggleLike} className={cn("inline-flex items-center gap-1", liked && "text-flame")}>
                <Heart weight={liked ? "fill" : "regular"} className="size-3.5" />
                <span className="font-mono">{likeCount}</span>
              </button>
              <span className="inline-flex items-center gap-1 font-mono">
                <GitFork className="size-3.5" />
                {detail.project.metrics.forkCount}
              </span>
              <span className="font-mono">{detail.project.metrics.viewCount} 浏览</span>
            </div>

            {message && (
              <p className="mt-3 rounded-xl bg-secondary/70 px-3 py-2 text-[11px] text-muted-foreground">
                {message}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card">
            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 scrollbar-none">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px]",
                    tab === item.key ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="max-h-[480px] overflow-y-auto p-4">
              {tab === "overview" && (
                <div className="space-y-4">
                  <PipelineExpanded
                    currentStage={detail.project.pipeline.currentStage}
                    status={detail.project.status}
                  />
                  {detail.project.openNeeds.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">当前缺口</p>
                      <ul className="space-y-2">
                        {detail.project.openNeeds.map((need) => (
                          <li key={need.id} className="rounded-xl bg-secondary/50 px-3 py-2 text-xs">
                            {need.label}
                            {need.remaining > 0 ? ` · 还需要 ${need.remaining} 人` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {tab === "nodes" && (
                <div className="space-y-3">
                  {selectedNode ? (
                    <div className="rounded-2xl border border-border/70 p-3">
                      <p className="text-sm font-medium">{selectedNode.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {selectedNode.summary ?? "公开节点"}
                      </p>
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {selectedNode.type} · {selectedNode.status}
                      </p>
                      {selectedNode.forkable && detail.project.permissions.allowFork && (
                        <button
                          type="button"
                          onClick={() => setForkOpen(true)}
                          className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] text-primary-foreground"
                        >
                          <GitFork className="size-3" />
                          从该节点 Fork
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">选择左侧节点查看详情</p>
                  )}
                  <ul className="space-y-1">
                    {detail.nodes.map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-left text-xs",
                            node.id === selectedNodeId ? "bg-secondary" : "hover:bg-secondary/50",
                          )}
                        >
                          {node.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === "activity" && (
                <ul className="space-y-3">
                  {detail.activities.length === 0 && (
                    <p className="text-xs text-muted-foreground">暂无活动</p>
                  )}
                  {detail.activities.map((item) => (
                    <li key={item.id} className="text-xs">
                      <p>
                        <span className="font-medium">{item.actor?.name ?? "系统"}</span>{" "}
                        <span className="text-muted-foreground">
                          {activityLabel(item.type, item.metadata)}
                        </span>
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {relativeTime(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {tab === "needs" && (
                <ul className="space-y-3">
                  {needs.length === 0 && (
                    <p className="text-xs text-muted-foreground">当前没有开放任务</p>
                  )}
                  {needs.map((need) => (
                    <li key={need.id} className="rounded-2xl border border-border/70 p-3">
                      <p className="text-sm font-medium">{need.title}</p>
                      {need.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{need.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {need.claimedCount}/{need.requiredCount} · {need.type}
                        </span>
                        {need.status !== "completed" && !need.viewerClaimed && need.remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClaim(need.id)}
                            className="rounded-full bg-primary px-3 py-1 text-[11px] text-primary-foreground"
                          >
                            申请认领
                          </button>
                        )}
                        {need.viewerClaimed && (
                          <span className="text-[11px] text-flame">已认领</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {tab === "collaborators" && (
                <ul className="space-y-2">
                  {detail.project.creator && (
                    <li className="flex items-center gap-2 text-xs">
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-serif">
                        {detail.project.creator.name[0]}
                      </span>
                      <span className="font-medium">@{detail.project.creator.name}</span>
                      <span className="text-muted-foreground">负责人</span>
                    </li>
                  )}
                  {detail.collaborators.map((person) => (
                    <li key={person.id} className="flex items-center gap-2 text-xs">
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-serif">
                        {person.name[0]}
                      </span>
                      <span className="font-medium">@{person.name}</span>
                      <span className="text-muted-foreground">{person.role}</span>
                    </li>
                  ))}
                  {detail.collaborators.length === 0 && !detail.project.creator && (
                    <p className="text-xs text-muted-foreground">暂无协作者</p>
                  )}
                </ul>
              )}

              {tab === "comments" && (
                <div className="space-y-3">
                  <form onSubmit={handleComment} className="space-y-2">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="写下你的想法…"
                      className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground/30"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] text-primary-foreground"
                    >
                      <ChatCircle className="size-3.5" />
                      发送评论
                    </button>
                  </form>
                  <ul className="space-y-3">
                    {comments.map((item) => (
                      <li key={item.id} className="text-xs">
                        <p className="font-medium">@{item.author.name}</p>
                        <p className="mt-0.5 text-muted-foreground">{item.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                          {relativeTime(item.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {detail.project.viewerState.relation === "owner" && (
            <Link
              href={`/studio?project=${detail.project.projectId}`}
              className="flex items-center justify-center rounded-full border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-secondary"
            >
              在工作台继续编辑
            </Link>
          )}
        </aside>
      </div>

      <ForkDialog
        card={detail.project}
        sourceNodeId={selectedNode?.id}
        open={forkOpen}
        onClose={() => setForkOpen(false)}
      />
    </div>
  )
}
