"use client"

import { ArrowRightIcon, ImageSquareIcon, SparkleIcon } from "@phosphor-icons/react"
import { useCanvasStore, type CanvasItem } from "@/lib/canvas-store"
import type { VisualDirection } from "@/lib/artifacts/competitor-style-artifact"

function swatchColor(value: string) {
  const match = value.match(/#[0-9a-f]{6}\b/i)
  return match?.[0] ?? "#d8d4cc"
}

export function CompetitorStyleNode({ item }: { item: CanvasItem }) {
  const artifact = item.competitorStyle
  const addItem = useCanvasStore((state) => state.addItem)
  if (!artifact) return null

  function chooseDirection(direction: VisualDirection, index: number) {
    const ratios = ["1:1", "4:3", "9:16"]
    addItem(
      {
        id: crypto.randomUUID(),
        type: "generator",
        title: `${direction.title} · 待生成`,
        prompt: direction.prompt,
        status: "idle",
        x: item.x + item.width + 64,
        y: item.y + index * 64,
        width: 420,
        height: 440,
        quality: "1K",
        count: 1,
        ratio: ratios[index] ?? "1:1",
        sourceStyleBoardId: item.id,
        sourceDirectionId: direction.id,
        designIteration: 1,
      },
      `选择视觉方向：${direction.title}`,
    )
  }

  return (
    <article className="flex size-full flex-col overflow-hidden rounded-2xl border border-[#d9ddd8] bg-[#f7f6f2] text-[#17211f] shadow-[0_18px_44px_-18px_rgba(23,33,31,0.35)]">
      <header className="flex items-start gap-3 border-b border-[#d9ddd8] bg-[#17211f] px-5 py-4 text-[#f5f4ef]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#88d7bd] text-[#17211f]">
          <SparkleIcon className="size-4" weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[9px] tracking-[0.2em] text-[#f5f4ef]/55">COMPETITOR STYLE DNA</p>
            <span className="rounded-full border border-[#88d7bd]/30 px-2 py-0.5 font-mono text-[9px] text-[#88d7bd]">TIKTOK SHOP</span>
          </div>
          <h3 className="mt-1.5 truncate text-[18px] font-bold leading-tight">{artifact.topic}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#f5f4ef]/65">{artifact.designGoal}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">REAL PRODUCTS · {artifact.products.length}</p>
            <p className="font-mono text-[9px] text-[#68716e]">${artifact.budget.estimatedActorUsd.toFixed(3)}</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {artifact.referenceImages.map((reference) => (
              <a
                key={reference.id}
                href={reference.productUrl}
                target="_blank"
                rel="noreferrer"
                title={reference.productTitle}
                className="nodrag nopan group aspect-square overflow-hidden rounded-lg border border-[#d9ddd8] bg-[#e8e6df]"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reference.url || "/placeholder.svg"}
                  alt={reference.productTitle}
                  draggable={false}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-[#d9ddd8] bg-white/70 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <ImageSquareIcon className="size-3.5 text-[#3b7465]" />
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">STYLE DNA</p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#37413e]">{artifact.styleProfile.summary}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {artifact.styleProfile.palette.slice(0, 6).map((color) => (
              <span key={color} className="flex items-center gap-1.5 rounded-full border border-[#d9ddd8] bg-[#f7f6f2] px-2 py-1 text-[9px] text-[#68716e]">
                <span className="size-2.5 rounded-full border border-black/10" style={{ backgroundColor: swatchColor(color) }} />
                {color}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] leading-relaxed">
            <p><span className="text-[#8a918f]">光线</span><br />{artifact.styleProfile.lighting}</p>
            <p><span className="text-[#8a918f]">构图</span><br />{artifact.styleProfile.composition}</p>
            <p><span className="text-[#8a918f]">背景</span><br />{artifact.styleProfile.background}</p>
            <p><span className="text-[#8a918f]">材质</span><br />{artifact.styleProfile.materials.join(" · ") || "待分析"}</p>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">3 ORIGINAL DIRECTIONS</p>
            <span className="text-[9px] text-[#8a918f]">选择后才进入生图</span>
          </div>
          <div className="flex flex-col gap-2">
            {artifact.visualDirections.map((direction, index) => (
              <button
                key={direction.id}
                type="button"
                className="nodrag nopan group flex w-full items-center gap-3 rounded-xl border border-[#d9ddd8] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#72bda6] hover:bg-[#f1faf6]"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => chooseDirection(direction, index)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e2f3ec] font-mono text-[10px] font-bold text-[#3b7465]">
                  0{index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">{direction.title}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-[#68716e]">{direction.description}</span>
                </span>
                <ArrowRightIcon className="size-3.5 shrink-0 text-[#8a918f] transition-transform group-hover:translate-x-0.5 group-hover:text-[#3b7465]" />
              </button>
            ))}
          </div>
        </section>

        {artifact.warnings.length ? (
          <p className="mt-3 rounded-lg bg-[#fff4d8] px-3 py-2 text-[9.5px] leading-relaxed text-[#80611f]">{artifact.warnings[0]}</p>
        ) : null}
      </div>
    </article>
  )
}
