"use client"

import { useState, useTransition } from "react"
import { CheckCircleIcon, ShareNetworkIcon } from "@phosphor-icons/react"

import { shareToExplore, unshareFromExplore } from "@/app/actions/explore"
import { EXPLORE_CATEGORIES, type ExploreCategory } from "@/lib/explore/categories"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  projectId: string
  projectName: string
  coverImage?: string | null
  isPublic?: boolean
  children: React.ReactNode
}

export function ShareDialog({
  projectId,
  projectName,
  coverImage,
  isPublic = false,
  children,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ExploreCategory>("产品")
  const [allowFork, setAllowFork] = useState(true)
  const [collaborationMode, setCollaborationMode] = useState<
    "closed" | "request" | "open_contributor"
  >("request")
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [publicNow, setPublicNow] = useState(isPublic)
  const [, startTransition] = useTransition()

  function handleShare() {
    if (status === "pending") return
    setStatus("pending")
    setError(null)
    startTransition(async () => {
      try {
        await shareToExplore({
          projectId,
          category,
          coverImage: coverImage ?? null,
          allowFork,
          collaborationMode,
        })
        setPublicNow(true)
        setStatus("done")
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "分享失败")
      }
    })
  }

  function handleUnshare() {
    setStatus("pending")
    startTransition(async () => {
      try {
        await unshareFromExplore(projectId)
        setPublicNow(false)
        setStatus("idle")
        setOpen(false)
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "撤回失败")
      }
    })
  }

  const categories = EXPLORE_CATEGORIES.filter((c) => c !== "全部")

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          setOpen(true)
          setStatus(publicNow ? "done" : "idle")
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {children}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="share-dialog-title" className="font-serif text-lg font-semibold">
              分享到灵感发现
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              分享「{projectName}」后，其他创作者可以看到企划进度、Fork 或申请协作。
            </p>

            {status === "done" && publicNow ? (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <CheckCircleIcon className="size-10 text-emerald-500" weight="fill" />
                <p className="text-sm font-medium">已发布到灵感发现</p>
                <p className="text-xs text-muted-foreground">
                  公开内容包括项目名称、封面、当前阶段与已批准产物；私有对话与内部备注不会公开。
                </p>
                <div className="mt-2 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={handleUnshare}
                    className="flex-1 rounded-full border border-border py-2 text-xs font-medium hover:bg-secondary"
                  >
                    撤回公开
                  </button>
                  <a
                    href={`/explore/${projectId}`}
                    className="flex flex-1 items-center justify-center rounded-full bg-primary py-2 text-xs font-medium text-primary-foreground"
                  >
                    查看公开页
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">选择分类</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat as ExploreCategory)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs transition-colors",
                          category === cat
                            ? "border border-flame/40 bg-flame/20 text-flame"
                            : "border border-transparent bg-secondary text-foreground/70 hover:text-foreground",
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="flex items-center justify-between gap-3 text-xs">
                    <span>允许他人 Fork</span>
                    <input
                      type="checkbox"
                      checked={allowFork}
                      onChange={(e) => setAllowFork(e.target.checked)}
                      className="size-4 accent-[var(--flame)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">协作模式</span>
                    <select
                      value={collaborationMode}
                      onChange={(e) =>
                        setCollaborationMode(e.target.value as typeof collaborationMode)
                      }
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <option value="request">需申请加入</option>
                      <option value="open_contributor">开放贡献者</option>
                      <option value="closed">关闭协作</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground/80">会公开</p>
                  <p>项目名称、封面、当前阶段、已批准产物、创作者资料</p>
                  <p className="mt-2 font-medium text-foreground/80">不会公开</p>
                  <p>私有对话、内部备注、API 配置、成本机密、未选择公开的内容</p>
                </div>

                {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-border py-2 text-xs font-medium transition-colors hover:bg-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={status === "pending"}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <ShareNetworkIcon className="size-3.5" />
                    {status === "pending" ? "发布中…" : "发布到灵感发现"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
