"use client"

import { useState } from "react"
import { CircleNotchIcon, MagicWandIcon, ShieldCheckIcon } from "@phosphor-icons/react"

import type { DesignReviewResult } from "@/lib/artifacts/design-review-artifact"
import { useCanvasStore, type CanvasItem } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

function scoreTone(score: number) {
  if (score >= 85) return "bg-[#dff6eb] text-[#23634f]"
  if (score >= 70) return "bg-[#fff0c9] text-[#7a5710]"
  return "bg-[#ffe1dc] text-[#8b352b]"
}

export function DesignReviewOverlay({ item, selected }: { item: CanvasItem; selected: boolean }) {
  const items = useCanvasStore((state) => state.items)
  const updateItem = useCanvasStore((state) => state.updateItem)
  const addItem = useCanvasStore((state) => state.addItem)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const styleBoard = items.find((candidate) => candidate.id === item.sourceStyleBoardId)
  const artifact = styleBoard?.competitorStyle
  const direction = artifact?.visualDirections.find((candidate) => candidate.id === item.sourceDirectionId)
  const review = item.designReview
  const iteration = item.designIteration ?? 1

  if (!artifact || !item.src) return null

  async function reviewDesign() {
    if (loading || !artifact || !item.src) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/design/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: item.src,
          currentPrompt: item.prompt ?? direction?.prompt ?? artifact.styleProfile.designPrompt,
          designGoal: artifact.designGoal,
          direction: direction ? { title: direction.title, description: direction.description } : undefined,
          styleProfile: artifact.styleProfile,
          referenceImages: artifact.referenceImages.map((reference) => reference.url),
        }),
      })
      const result = (await response.json()) as { review?: DesignReviewResult; error?: string }
      if (!response.ok || !result.review) throw new Error(result.error || "设计审查没有返回结果")
      updateItem(item.id, { designReview: result.review }, "完成设计审查")
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "设计审查失败")
    } finally {
      setLoading(false)
    }
  }

  function createReinforcedVersion() {
    if (!review || iteration >= 2) return
    addItem(
      {
        id: crypto.randomUUID(),
        type: "generator",
        title: `${direction?.title ?? "设计方向"} · 加强版 V${iteration + 1}`,
        prompt: review.revisedPrompt,
        src: item.src,
        status: "idle",
        x: item.x + item.width + 48,
        y: item.y,
        width: 420,
        height: 440,
        quality: "1K",
        count: 1,
        ratio: item.ratio ?? "1:1",
        sourceStyleBoardId: item.sourceStyleBoardId,
        sourceDirectionId: item.sourceDirectionId,
        designIteration: iteration + 1,
      },
      `创建加强版 V${iteration + 1}`,
    )
  }

  return (
    <>
      {review ? (
        <span className={cn("pointer-events-none absolute right-2 top-2 rounded-full px-2 py-1 font-mono text-[10px] font-bold shadow-sm", scoreTone(review.totalScore))}>
          {review.totalScore} / 100
        </span>
      ) : null}

      {selected ? (
        <section
          className="nodrag nopan absolute inset-x-2 bottom-2 rounded-xl border border-white/60 bg-[#17211f]/95 p-2.5 text-[#f7f6f2] shadow-xl backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {review ? (
            <>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[#88d7bd] text-[#17211f]">
                  <ShieldCheckIcon className="size-3.5" weight="fill" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[10px] font-semibold">设计 Agent 审查 · V{iteration}</p>
                <span className="font-mono text-[10px] font-bold text-[#88d7bd]">{review.totalScore}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9.5px] leading-relaxed text-white/75">{review.summary}</p>
              {review.issues[0] ? (
                <p className="mt-1.5 line-clamp-2 text-[9px] leading-relaxed text-[#ffd78a]">需加强：{review.issues[0]}</p>
              ) : null}
              <div className="mt-2 flex items-center gap-1.5">
                {iteration < 2 ? (
                  <button
                    type="button"
                    onClick={createReinforcedVersion}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#88d7bd] px-2 py-1.5 text-[9.5px] font-semibold text-[#17211f] transition-colors hover:bg-[#a1e4ce]"
                  >
                    <MagicWandIcon className="size-3" weight="fill" />
                    创建加强版
                  </button>
                ) : (
                  <span className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-center text-[9.5px] text-white/65">两轮优化已完成</span>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void reviewDesign()}
                  className="rounded-lg border border-white/15 px-2 py-1.5 text-[9.5px] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  {loading ? "审查中…" : "重新审查"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[#88d7bd] text-[#17211f]">
                  <ShieldCheckIcon className="size-3.5" weight="fill" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold">与 Style DNA 对照审查</p>
                  <p className="truncate text-[8.5px] text-white/55">风格 · 主体 · 原创性 · 销售力</p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void reviewDesign()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#88d7bd] px-2.5 py-1.5 text-[9.5px] font-semibold text-[#17211f] transition-colors hover:bg-[#a1e4ce] disabled:opacity-60"
                >
                  {loading ? <CircleNotchIcon className="size-3 animate-spin" /> : <ShieldCheckIcon className="size-3" weight="fill" />}
                  {loading ? "审查中" : "设计审查"}
                </button>
              </div>
              {error ? <p className="mt-2 line-clamp-2 text-[9px] text-[#ffaaa0]">{error}</p> : null}
            </>
          )}
          {review && error ? <p className="mt-1.5 line-clamp-2 text-[9px] text-[#ffaaa0]">{error}</p> : null}
        </section>
      ) : null}
    </>
  )
}
