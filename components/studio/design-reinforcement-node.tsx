"use client"

import { CheckCircleIcon, ImageSquareIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react"

import type { CanvasItem } from "@/lib/canvas-store"
import type { DesignDirectionStrategy, VisualPatternRecommendation } from "@/lib/artifacts/design-reinforcement-artifact"

const strategyLabel: Record<DesignDirectionStrategy, string> = {
  validated: "A · 市场验证型",
  differentiated: "B · 品牌差异型",
  experimental: "C · 实验突破型",
}

const strategyTone: Record<DesignDirectionStrategy, string> = {
  validated: "border-[#99c9b8] bg-[#edf8f3] text-[#285f50]",
  differentiated: "border-[#b7b4dc] bg-[#f2f1fb] text-[#514e85]",
  experimental: "border-[#e7c184] bg-[#fff7e8] text-[#7a5621]",
}

const recommendationLabel: Record<VisualPatternRecommendation, string> = {
  adopt: "必须遵守",
  adapt: "适配借鉴",
  experiment: "小规模实验",
  avoid: "避免使用",
}

export function DesignReinforcementNode({ item }: { item: CanvasItem }) {
  const artifact = item.designReinforcement
  if (!artifact) return null
  const evidence = artifact.creative_evidence.evidence

  return (
    <article className="flex size-full flex-col overflow-hidden rounded-2xl border border-[#d8dcd9] bg-[#f6f5f1] text-[#17211f] shadow-[0_20px_52px_-20px_rgba(23,33,31,0.38)]">
      {item.stale ? <div className="flex items-center gap-2 border-b border-[#e7c184] bg-[#fff1cf] px-5 py-2 text-[9.5px] font-medium text-[#7a5621]"><WarningCircleIcon className="size-3.5 shrink-0" />{item.staleReason || "Product Brief 已更新，请重新运行设计强化"}</div> : null}
      <header className="flex items-start gap-3 border-b border-white/10 bg-[#17211f] px-5 py-4 text-[#f7f6f2]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#88d7bd] text-[#17211f]">
          <SparkleIcon className="size-4" weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[9px] tracking-[0.18em] text-white/50">DESIGN REINFORCEMENT · DIRECTIONS READY</p>
            <span className="rounded-full border border-[#88d7bd]/30 px-2 py-0.5 font-mono text-[9px] text-[#88d7bd]">EVIDENCE GROUNDED</span>
          </div>
          <h3 className="mt-1.5 truncate text-[18px] font-bold leading-tight">{artifact.topic}</h3>
          <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-white/60">
            {artifact.product_brief.product_name} · Brief v{artifact.product_brief.version} · {artifact.target_assets.join(" / ")}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">01 · CREATIVE EVIDENCE</p>
            <p className="font-mono text-[9px] text-[#68716e]">{evidence.length} ACCEPTED · {artifact.evidence_cleaning.rejected.length} REJECTED</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {evidence.slice(0, 5).map((entry) => (
              <a
                key={entry.evidence_id}
                href={entry.source_url}
                target="_blank"
                rel="noreferrer"
                title={`${entry.evidence_id} · ${entry.title}`}
                className="nodrag nopan group relative aspect-square overflow-hidden rounded-lg border border-[#d8dcd9] bg-[#e8e6df]"
                onPointerDown={(event) => event.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.media.cover_image || entry.media.image_urls[0] || "/placeholder.svg"} alt={entry.title} draggable={false} className="size-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/65 px-1 py-0.5 font-mono text-[7px] text-white">{entry.evidence_id}</span>
              </a>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[#d8dcd9] bg-white/70 px-3 py-2 font-mono text-[8.5px] text-[#68716e]">
            <span>RUN {artifact.creative_evidence.actor_run_id}</span>
            <span>${artifact.budget.estimated_actor_usd.toFixed(3)} / ${artifact.budget.max_usd.toFixed(2)}</span>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">02 · VISUAL PATTERN LIBRARY</p>
            <span className="text-[9px] text-[#8a918f]">表现 30% · 重复 25% · 匹配 20%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {artifact.pattern_library.slice(0, 6).map((pattern) => (
              <div key={pattern.pattern_id} className="rounded-xl border border-[#d8dcd9] bg-white/80 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e4f3ed] font-mono text-[9px] font-bold text-[#326958]">{pattern.pattern_score}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold">{pattern.name}</p>
                    <p className="mt-0.5 font-mono text-[7.5px] uppercase tracking-wide text-[#8a918f]">{recommendationLabel[pattern.use_recommendation]} · {pattern.evidence_ids.length} evidence</p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-[#5c6562]">{pattern.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-[#d8dcd9] bg-[#17211f] px-4 py-3 text-[#f7f6f2]">
          <div className="flex items-center gap-2">
            <ImageSquareIcon className="size-3.5 text-[#88d7bd]" />
            <p className="font-mono text-[9px] tracking-[0.16em] text-white/50">03 · VISUAL DNA</p>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[9.5px] leading-relaxed text-white/70">
            <div><span className="text-[#88d7bd]">构图规则</span><p className="mt-0.5 line-clamp-3">{artifact.visual_dna.composition_rules.slice(0, 2).join("；")}</p></div>
            <div><span className="text-[#88d7bd]">图像规则</span><p className="mt-0.5 line-clamp-3">{artifact.visual_dna.imagery_rules.slice(0, 2).join("；")}</p></div>
            <div><span className="text-[#88d7bd]">色彩策略</span><p className="mt-0.5 line-clamp-2">{artifact.visual_dna.color_strategy.slice(0, 2).join("；") || "证据不足"}</p></div>
            <div><span className="text-[#f2b8ae]">禁止模式</span><p className="mt-0.5 line-clamp-2">{artifact.visual_dna.forbidden_patterns.slice(0, 2).join("；")}</p></div>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#68716e]">04 · THREE DESIGN DIRECTIONS</p>
            <span className="rounded-full bg-[#e8e6df] px-2 py-0.5 text-[8.5px] text-[#68716e]">等待用户确认 · 不生图</span>
          </div>
          <div className="flex flex-col gap-2">
            {artifact.design_directions.map((direction) => (
              <div key={direction.direction_id} className={`rounded-xl border px-3.5 py-3 ${strategyTone[direction.strategy]}`}>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-current/20 px-2 py-0.5 font-mono text-[8px] font-bold">{strategyLabel[direction.strategy]}</span>
                  <p className="truncate text-[11px] font-bold">{direction.name}</p>
                </div>
                <p className="mt-2 text-[9.5px] leading-relaxed opacity-85">{direction.core_idea}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[8.5px] leading-relaxed opacity-75">
                  <p><span className="font-semibold">布局：</span>{direction.layout_rules[0]}</p>
                  <p><span className="font-semibold">图像：</span>{direction.image_rules[0]}</p>
                </div>
                <p className="mt-2 border-t border-current/10 pt-2 text-[8.5px] leading-relaxed opacity-70">差异化：{direction.differentiation_statement}</p>
              </div>
            ))}
          </div>
        </section>

        {artifact.evidence_trace.unresolved_gaps.length ? (
          <section className="mt-4 rounded-xl border border-[#e7c184] bg-[#fff7e8] px-3.5 py-3 text-[#7a5621]">
            <div className="flex items-center gap-2 text-[9px] font-semibold"><WarningCircleIcon className="size-3.5" />EVIDENCE GAPS</div>
            <p className="mt-1.5 text-[9px] leading-relaxed">{artifact.evidence_trace.unresolved_gaps[0]}</p>
          </section>
        ) : (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#edf8f3] px-3 py-2 text-[9px] text-[#285f50]"><CheckCircleIcon className="size-3.5" weight="fill" />全部核心结论均可追溯到 evidence_id</p>
        )}
      </div>
    </article>
  )
}
