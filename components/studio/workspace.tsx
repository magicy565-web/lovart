"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  PaperPlaneTiltIcon,
  RocketLaunchIcon,
  SparkleIcon,
} from "@phosphor-icons/react"
import { LogoMark } from "@/components/landing/logo-mark"
import { TaskMap } from "@/components/studio/task-map"
import { BriefView, CampaignView, ValidationView, VisualsView } from "@/components/studio/artifact-views"
import { useProject, useSignalCounts, currentContentOf, revisionsOf } from "@/features/studio/client/use-project"
import { createProject, startTask, completeTask, saveRevision, switchRevision, publishProject } from "@/app/actions/studio"
import { TASK_PLAN, SUGGESTED_PROMPTS } from "@/lib/studio/demo-data"
import type { ArtifactContent, BriefContent, CampaignContent, StudioArtifact, ValidationContent, VisualsContent } from "@/lib/studio/types"
import { cn } from "@/lib/utils"

const ARTIFACT_LABELS: Record<string, string> = {
  brief: "产品定义",
  visuals: "视觉资产",
  campaign: "众筹页面",
  validation: "验证设置",
}

export function Workspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("p")

  const { state, mutate, isLoading } = useProject(projectId)
  const published = state?.project.status === "published"
  const { counts } = useSignalCounts(projectId, !!published)

  const [activeTab, setActiveTab] = useState("brief")
  const [editInstruction, setEditInstruction] = useState("")
  const [editPending, setEditPending] = useState(false)
  const [publishPending, setPublishPending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const runnerStarted = useRef(false)

  // ---- 任务执行器:创建后按计划推进,逐步点亮任务与产物 ----
  const runTasks = useCallback(
    async (pid: string) => {
      const fresh = await mutate()
      const pending = (fresh?.tasks ?? []).filter((t) => t.status !== "done")
      for (const task of pending) {
        await startTask(pid, task.id)
        await mutate()
        const plan = TASK_PLAN.find((p) => p.type === task.type)
        await new Promise((r) => setTimeout(r, plan?.durationMs ?? 2500))
        await completeTask(pid, task.id)
        await mutate()
      }
    },
    [mutate],
  )

  useEffect(() => {
    if (!state || runnerStarted.current) return
    const hasUnfinished = state.tasks.some((t) => t.status !== "done")
    if (hasUnfinished && state.project.status !== "published") {
      runnerStarted.current = true
      void runTasks(state.project.id)
    }
  }, [state, runTasks])

  // ---- 入口:提交灵感创建项目 ----
  const [prompt, setPrompt] = useState("")
  const [creating, setCreating] = useState(false)

  async function handleCreate(text: string) {
    if (!text.trim() || creating) return
    setCreating(true)
    const { projectId: pid } = await createProject(text.trim())
    router.replace(`/studio?p=${pid}`)
  }

  // ---- 编辑:保存新 Revision ----
  async function persistContent(artifact: StudioArtifact, content: ArtifactContent, promptText: string) {
    await saveRevision(artifact.id, content, promptText)
    await mutate()
  }

  // ---- 对话修改 ----
  async function handleChatEdit(artifact: StudioArtifact, content: ArtifactContent) {
    const instruction = editInstruction.trim()
    if (!instruction || editPending) return
    setEditPending(true)
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instruction, artifactType: artifact.type }),
      })
      const data = (await res.json()) as { content: ArtifactContent; note?: string }
      await persistContent(artifact, data.content, instruction)
      setEditInstruction("")
    } finally {
      setEditPending(false)
    }
  }

  // ---- 发布 ----
  async function handlePublish() {
    if (!projectId || publishPending) return
    setPublishPending(true)
    try {
      const slug = await publishProject(projectId)
      await mutate()
      window.open(`/campaign/${slug}`, "_blank", "noopener")
    } finally {
      setPublishPending(false)
    }
  }

  // ================= 入口状态 =================
  if (!projectId) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <StudioHeader name="新建发布企划" />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xl">
            <p className="text-center font-serif text-3xl text-balance">今天想发布什么产品?</p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              描述你的灵感,智能体会完成从产品定义到众筹页面的全部工作
            </p>
            <form
              className="mt-8 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50"
              onSubmit={(e) => {
                e.preventDefault()
                void handleCreate(prompt)
              }}
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如:为城市通勤者设计一款模块化防雨背包"
                aria-label="产品灵感"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={creating || !prompt.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="开始生成"
              >
                {creating ? <CircleNotchIcon className="size-4 animate-spin" /> : <PaperPlaneTiltIcon className="size-4" />}
              </button>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((s) => (
                <button
                  key={s}
                  onClick={() => void handleCreate(s)}
                  disabled={creating}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ================= 加载状态 =================
  if (isLoading || !state) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <CircleNotchIcon className="size-6 animate-spin text-primary" />
        <span className="sr-only">加载项目中</span>
      </div>
    )
  }

  const { project, tasks, artifacts, revisions } = state
  const activeArtifact = artifacts.find((a) => a.type === activeTab) ?? artifacts[0]
  const activeContent = activeArtifact ? currentContentOf(activeArtifact, revisions) : null
  const activeRevisions = activeArtifact ? revisionsOf(activeArtifact, revisions) : []
  const visualsArtifact = artifacts.find((a) => a.type === "visual-system")
  const visualsContent = visualsArtifact ? (currentContentOf(visualsArtifact, revisions) as VisualsContent | null) : null
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "done")

  return (
    <div className="flex h-dvh flex-col bg-background">
      <StudioHeader name={project.name}>
        {published ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground max-sm:hidden">
              <span>访问 {counts.visit ?? 0}</span>
              <span>CTA {counts.cta_click ?? 0}</span>
              <span>留资 {counts.email ?? 0}</span>
              <span>早鸟 {counts.earlybird ?? 0}</span>
            </div>
            <Link
              href={`/campaign/${project.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              查看发布页
                <ArrowUpRightIcon className="size-3.5" />
            </Link>
          </div>
        ) : (
          <button
            onClick={() => void handlePublish()}
            disabled={!allDone || publishPending}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
              {publishPending ? <CircleNotchIcon className="size-3.5 animate-spin" /> : <RocketLaunchIcon className="size-3.5" />}
            发布验证页
          </button>
        )}
      </StudioHeader>

      <div className="flex min-h-0 flex-1">
        {/* 左侧:任务地图 */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-card p-4 max-md:hidden" aria-label="任务进度">
          <TaskMap tasks={tasks} />
          {allDone && !published && (
            <p className="mt-4 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-primary">
              全部任务完成。检查内容后点击右上角「发布验证页」,开始收集真实购买意愿。
            </p>
          )}
        </aside>

        {/* 中间:Artifact 区域 */}
        <main className="flex min-w-0 flex-1 flex-col" aria-label="产物工作区">
          {/* Tab 栏 */}
          <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 pt-2">
            {artifacts.map((artifact) => {
              const ready = artifact.status === "ready"
              return (
                <button
                  key={artifact.id}
                  onClick={() => {
                    setActiveTab(artifact.type)
                    setShowHistory(false)
                  }}
                  disabled={!ready}
                  className={cn(
                    "relative rounded-t-lg px-4 py-2.5 text-sm transition-colors",
                    activeTab === artifact.type
                      ? "font-medium text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary"
                      : ready
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/40",
                  )}
                >
                  {ARTIFACT_LABELS[artifact.type]}
                  {!ready && <CircleNotchIcon className="ml-1.5 inline size-3 animate-spin" aria-label="生成中" />}
                </button>
              )
            })}
            {activeRevisions.length > 1 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className={cn(
                  "ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors",
                  showHistory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ClockCounterClockwiseIcon className="size-3.5" />
                {activeRevisions.length} 个版本
              </button>
            )}
          </div>

          {/* 版本历史 */}
          {showHistory && activeArtifact && (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-secondary/50 px-4 py-2">
              {activeRevisions.map((rev) => (
                <button
                  key={rev.id}
                  onClick={async () => {
                    await switchRevision(activeArtifact.id, rev.id)
                    await mutate()
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                    rev.id === activeArtifact.currentRevisionId
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  title={rev.prompt}
                >
                  v{rev.version}
                </button>
              ))}
            </div>
          )}

          {/* 内容区 */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!activeArtifact || activeArtifact.status !== "ready" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <CircleNotchIcon className="size-6 animate-spin text-primary" />
                <p className="text-sm">智能体正在生成{activeArtifact ? ARTIFACT_LABELS[activeArtifact.type] : "内容"}…</p>
              </div>
            ) : activeArtifact.type === "brief" && activeContent ? (
              <BriefView
                content={activeContent as BriefContent}
                onChange={(next) => void persistContent(activeArtifact, next, "文本编辑")}
              />
            ) : activeArtifact.type === "visual-system" && activeContent ? (
              <VisualsView content={activeContent as VisualsContent} />
            ) : activeArtifact.type === "campaign" && activeContent ? (
              <CampaignView
                content={activeContent as CampaignContent}
                visuals={visualsContent}
                onChange={(next) => void persistContent(activeArtifact, next, "文本编辑")}
              />
            ) : activeArtifact.type === "validation" && activeContent ? (
              <ValidationView
                content={activeContent as ValidationContent}
                onChange={(next) => void persistContent(activeArtifact, next, "调整验证方式")}
              />
            ) : null}
          </div>

          {/* 对话修改栏 */}
          {activeArtifact?.status === "ready" && activeArtifact.type !== "validation" && (
            <form
              className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (activeContent) void handleChatEdit(activeArtifact, activeContent)
              }}
            >
              <SparkleIcon weight="fill" className="size-4 shrink-0 text-primary" aria-hidden />
              <input
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder={`用一句话修改${ARTIFACT_LABELS[activeArtifact.type]},例如「文案更简洁一些」`}
                aria-label="对话修改指令"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={editPending || !editInstruction.trim()}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {editPending ? <CircleNotchIcon className="size-3.5 animate-spin" /> : <PaperPlaneTiltIcon className="size-3.5" />}
                {editPending ? "修改中" : "修改"}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}

function StudioHeader({ name, children }: { name: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
            <ArrowLeftIcon className="size-4" />
        返回首页
      </Link>
      <div className="mx-2 h-4 w-px bg-border" aria-hidden />
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark className="size-5" />
        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>
  )
}
