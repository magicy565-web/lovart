"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { GitFork, SpinnerGap } from "@phosphor-icons/react"

import { forkProject } from "@/app/actions/explore"
import type { ExploreCard } from "@/features/explore/contracts"
import { cn } from "@/lib/utils"

interface ForkDialogProps {
  card: ExploreCard | null
  sourceNodeId?: string
  open: boolean
  onClose: () => void
}

const SCOPES = [
  { value: "full_project", label: "基于整个企划", desc: "继承所有允许公开复用的内容" },
  { value: "direction", label: "基于当前方向", desc: "只继承当前设计路线" },
  { value: "artifact", label: "基于当前节点", desc: "从特定产物开始新路线" },
] as const

const MODES = [
  { value: "continue", label: "继续完成", desc: "保留定位，推进未完成阶段" },
  { value: "reposition", label: "改变定位", desc: "改用户、场景、市场或价格" },
  { value: "explore", label: "探索新路线", desc: "基于当前项目生成新方向" },
] as const

export function ForkDialog({ card, sourceNodeId, open, onClose }: ForkDialogProps) {
  const router = useRouter()
  const [scope, setScope] = useState<(typeof SCOPES)[number]["value"]>("full_project")
  const [mode, setMode] = useState<(typeof MODES)[number]["value"]>("continue")
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [studioUrl, setStudioUrl] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (!open || !card) return null

  const defaultTitle = title || `${card.title} · Fork`

  function handleCreate() {
    if (!card || status === "pending") return
    setStatus("pending")
    setError(null)
    startTransition(async () => {
      try {
        const result = await forkProject({
          projectId: card.projectId,
          title: defaultTitle,
          scope,
          mode,
          sourceNodeId,
        })
        setStudioUrl(result.studioUrl)
        setStatus("done")
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Fork 失败，请先登录")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== "pending") onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fork-dialog-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-flame/15 text-flame">
            <GitFork className="size-5" />
          </div>
          <div>
            <h2 id="fork-dialog-title" className="font-serif text-lg font-semibold">
              Fork 企划
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              从「{card.title}」创建属于你的独立分支，原项目不受影响。
            </p>
          </div>
        </div>

        {status === "done" && studioUrl ? (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full origin-left animate-none bg-flame" />
            </div>
            <p className="text-sm font-medium">独立项目已创建</p>
            <p className="text-xs text-muted-foreground">
              已保留来源关系，可在工作台继续推进。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-border py-2.5 text-xs font-medium hover:bg-secondary"
              >
                稍后
              </button>
              <button
                type="button"
                onClick={() => router.push(studioUrl)}
                className="flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground"
              >
                进入工作台
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-6">
              <p className="mb-2 text-xs font-medium text-muted-foreground">1. 选择 Fork 来源</p>
              <div className="grid gap-2">
                {SCOPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setScope(item.value)}
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      scope === item.value
                        ? "border-flame/40 bg-flame/10"
                        : "border-border hover:bg-secondary/60",
                    )}
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">2. 选择意图</p>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value)}
                    className={cn(
                      "rounded-2xl border px-2 py-2.5 text-left transition-colors",
                      mode === item.value
                        ? "border-flame/40 bg-flame/10"
                        : "border-border hover:bg-secondary/60",
                    )}
                  >
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{item.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4">
              <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="fork-title">
                3. 新项目名称
              </label>
              <input
                id="fork-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/30"
              />
            </section>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={status === "pending"}
                className="flex-1 rounded-full border border-border py-2.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={status === "pending" || !card.permissions.allowFork}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {status === "pending" ? (
                  <>
                    <SpinnerGap className="size-3.5 animate-spin" />
                    正在创建独立项目…
                  </>
                ) : (
                  <>
                    <GitFork className="size-3.5" />
                    创建分支
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
