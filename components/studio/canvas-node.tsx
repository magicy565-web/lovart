"use client"

import { memo, useState } from "react"
import {
  ArrowUpIcon,
  CaretDownIcon,
  CircleNotchIcon,
  ImageSquareIcon,
  LightningIcon,
} from "@phosphor-icons/react"
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCanvasStore, type CanvasItem } from "@/lib/canvas-store"
import { BriefNode } from "@/components/studio/brief-node"
import { CompetitorStyleNode } from "@/components/studio/competitor-style-node"
import { DesignReviewOverlay } from "@/components/studio/design-review-overlay"
import { DesignReinforcementNode } from "@/components/studio/design-reinforcement-node"
import { cn } from "@/lib/utils"

type FlowNode = Node<CanvasItem & Record<string, unknown>, "canvasItem">

const qualityLabel: Record<string, string> = { low: "低", medium: "中", high: "高" }

const stylePresets: { key: string; label: string; prompt: string }[] = [
  { key: "poster", label: "海报", prompt: "bold poster design, striking typography layout, high contrast, professional graphic design" },
  { key: "ecommerce", label: "电商主图", prompt: "clean e-commerce product photography, pure white background, studio lighting, centered composition" },
  { key: "illustration", label: "插画", prompt: "flat vector illustration, vibrant colors, clean shapes, modern digital art style" },
  { key: "photo", label: "摄影", prompt: "professional photography, natural lighting, shallow depth of field, photorealistic, 85mm lens" },
  { key: "brand", label: "品牌视觉", prompt: "premium brand identity visual, minimal elegant composition, sophisticated color palette" },
]

function GeneratorNode({ id, data }: { id: string; data: CanvasItem }) {
  const update = useCanvasStore((s) => s.updateItem)
  const add = useCanvasStore((s) => s.addItem)
  const [prompt, setPrompt] = useState(data.prompt ?? "")

  async function generate() {
    const value = prompt.trim()
    if (!value || data.status === "generating") return
    const preset = stylePresets.find((p) => p.key === data.stylePreset)
    const fullPrompt = preset ? `${value}, ${preset.prompt}` : value
    update(id, { prompt: value, status: "generating" }, "开始生成图像")
    try {
      const r = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, ratio: data.ratio ?? "1:1", quality: data.quality ?? "1K", count: data.count ?? 1, referenceImage: data.src }),
      })
      const result = (await r.json()) as { url?: string; urls?: string[]; error?: string }
      const urls = result.urls ?? (result.url ? [result.url] : [])
      if (!r.ok || !urls.length) throw new Error(result.error)
      update(id, { status: "done", error: undefined }, "完成图像生成")
      const ratio = data.ratio ?? "1:1"
      const portrait = ratio === "3:4" || ratio === "9:16"
      const landscape = ratio === "4:3" || ratio === "16:9"
      const w = portrait ? 240 : landscape ? 320 : 300
      const h = portrait ? 320 : landscape ? 240 : 300
      const groupId = urls.length > 1 ? crypto.randomUUID() : undefined
      urls.forEach((src, index) => add({ id: crypto.randomUUID(), type: "image", title: urls.length > 1 ? `变体 ${index + 1} · ${value.slice(0, 14)}` : value.slice(0, 18), src, prompt: fullPrompt, ratio, groupId, sourceStyleBoardId: data.sourceStyleBoardId, sourceDirectionId: data.sourceDirectionId, designIteration: data.designIteration, x: data.x + data.width + 48 + (index % 2) * (w + 24), y: data.y + Math.floor(index / 2) * (h + 24), width: w, height: h }))
    } catch (error) {
      update(id, { status: "error", error: error instanceof Error ? error.message : "图像生成失败" }, "图像生成失败")
    }
  }

  return (
    <div className="flex size-full flex-col rounded-[24px] border border-black/5 bg-card p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start">
        <label className="nodrag relative flex h-[84px] w-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted">
          {data.src ? <img src={data.src} alt="生成参考图" className="size-full object-cover" /> : <><ImageSquareIcon size={20} /><span className="text-xs">参考图</span></>}
          <input type="file" accept="image/*" className="sr-only" onChange={(event)=>{const file=event.target.files?.[0];if(file)update(id,{src:URL.createObjectURL(file)},true,'上传参考图')}} />
        </label>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
            e.preventDefault()
            void generate()
          }
        }}
        placeholder="今天我们要创作什么"
        aria-label="图像生成描述"
        className="nodrag min-h-0 flex-1 resize-none bg-transparent py-3 text-xl leading-relaxed outline-none placeholder:text-muted-foreground/60"
      />
      <div className="nodrag mb-2.5 flex flex-wrap items-center gap-1.5">
        {stylePresets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => update(id, { stylePreset: data.stylePreset === p.key ? undefined : p.key })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              data.stylePreset === p.key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => update(id, { count: (data.count ?? 1) === 4 ? 1 : 4 })}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            (data.count ?? 1) === 4
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          变体×4
        </button>
      </div>
      <div className="nodrag flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted"
              />
            }
          >
            {qualityLabel[data.quality ?? "medium"]} · auto · {data.count ?? 1} 张
            <CaretDownIcon size={13} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={8} className="w-40 rounded-2xl p-1.5">
            <DropdownMenuGroup>
              {(["low", "medium", "high"] as const).map((q) => (
                <DropdownMenuItem key={q} className="rounded-xl" onClick={() => update(id, { quality: q })}>
                  质量：{qualityLabel[q]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              {["1:1", "4:3", "3:4", "16:9", "9:16"].map((ratio) => (
                <DropdownMenuItem key={ratio} className="rounded-xl" onClick={() => update(id, { ratio })}>比例：{ratio}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              {[1, 2, 4].map((n) => (
                <DropdownMenuItem key={n} className="rounded-xl" onClick={() => update(id, { count: n })}>
                  数量：{n} 张
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1.5 text-sm text-foreground/80">
          <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
            <LightningIcon size={12} weight="fill" />
          </span>
          image2 1K
          <CaretDownIcon size={13} className="text-muted-foreground" />
        </div>

        <button
          type="button"
          disabled={!prompt.trim() || data.status === "generating"}
          onClick={() => void generate()}
          aria-label="生成图像"
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-colors",
            prompt.trim() && data.status !== "generating"
              ? "bg-foreground text-background hover:opacity-90"
              : "bg-muted text-muted-foreground",
          )}
        >
          {data.status === "generating" ? <CircleNotchIcon size={16} className="animate-spin" /> : <ArrowUpIcon size={16} weight="bold" />}
        </button>
      </div>
      {data.status === "error" && <p className="mt-2 text-xs text-destructive">{data.error || "生成失败，请重试。"}</p>}
    </div>
  )
}

function Shape({ item }: { item: CanvasItem }) {
  const common = {
    stroke: item.stroke ?? "#1f1f1f",
    strokeWidth: item.strokeWidth ?? 2,
    fill: ["line", "arrow", "drawing"].includes(item.type) ? "none" : (item.fill ?? "#ffffff"),
  }
  return (
    <svg className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {item.type === "drawing" ? (
        <path d={item.path} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" {...common} />
      ) : item.type === "ellipse" ? (
        <ellipse cx="50" cy="50" rx="48" ry="48" {...common} />
      ) : item.type === "line" ? (
        <line x1="4" y1="50" x2="96" y2="50" {...common} />
      ) : item.type === "arrow" ? (
        <>
          <line x1="4" y1="50" x2="90" y2="50" {...common} />
          <polyline points="75,30 95,50 75,70" fill="none" stroke={common.stroke} strokeWidth={common.strokeWidth} />
        </>
      ) : item.type === "star" ? (
        <polygon points="50,3 61,36 97,36 68,57 79,92 50,71 21,92 32,57 3,36 39,36" {...common} />
      ) : item.type === "polygon" ? (
        <polygon points="50,3 96,28 86,82 14,82 4,28" {...common} />
      ) : (
        <rect x="2" y="2" width="96" height="96" rx="3" {...common} />
      )}
    </svg>
  )
}

function View({ id, data, selected }: NodeProps<FlowNode>) {
  const update = useCanvasStore((s) => s.updateItem)
  const shape = data.type
  const isGenerator = shape === "generator"

  return (
    <div className={cn("group relative size-full", data.hidden && "opacity-20")}>
      <NodeResizer
        isVisible={!!selected && !data.locked}
        minWidth={60}
        minHeight={40}
        lineClassName="!border-[#3b82f6]"
        handleClassName="!size-2.5 !rounded-[3px] !border-2 !border-white !bg-[#3b82f6] !shadow-sm"
        onResizeEnd={(_, s) => update(id, { width: s.width, height: s.height }, "调整图层尺寸")}
      />

      {selected && (
        <span className="absolute -top-6.5 left-0 flex items-center gap-2 text-xs font-medium text-[#3b82f6]">
          {data.title}
          <span className="text-[#3b82f6]/70">
            {Math.round(data.width)} × {Math.round(data.height)}
          </span>
        </span>
      )}

      {isGenerator ? (
        <div className={cn("size-full", selected && "rounded-[24px] ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-background")}>
          <GeneratorNode id={id} data={data} />
        </div>
      ) : (
        <article
          className={cn(
            "size-full",
            shape !== "brief" && shape !== "competitor-style" && shape !== "design-reinforcement" && "overflow-hidden",
            selected && "ring-2 ring-[#3b82f6]",
            (shape === "brief" || shape === "competitor-style" || shape === "design-reinforcement") && "rounded-xl",
            shape === "frame" && "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
            (shape === "image" || shape === "video") && "rounded-sm",
          )}
          style={shape === "frame" ? { background: data.fill ?? "#ffffff" } : undefined}
        >
          {shape === "brief" && data.brief && <BriefNode item={data} />}
          {shape === "competitor-style" && data.competitorStyle && <CompetitorStyleNode item={data} />}
          {shape === "design-reinforcement" && data.designReinforcement && <DesignReinforcementNode item={data} />}
          {shape === "image" && data.src && <div className="relative size-full"><img src={data.src || "/placeholder.svg"} alt={data.title} draggable={false} className="pointer-events-none size-full object-cover" /><DesignReviewOverlay item={data} selected={Boolean(selected)} /></div>}
          {shape === "video" && data.src && <video src={data.src} controls className="nodrag size-full object-cover" />}
          {shape === "text" && (
            <textarea
              value={data.text}
              onFocus={() => useCanvasStore.getState().checkpoint("编辑文字")}
              onChange={(e) => update(id, { text: e.target.value })}
              aria-label="画布文字"
              style={{ fontSize: data.fontSize ?? 24, fontWeight: data.fontWeight ?? 500, lineHeight: data.lineHeight ?? 1.4, textAlign: data.align ?? "left", color: data.stroke ?? "#1f1f1f" }}
              className="nodrag size-full resize-none bg-transparent p-2 outline-none"
            />
          )}
          {["rectangle", "ellipse", "star", "polygon", "line", "arrow", "drawing"].includes(shape) && <Shape item={data} />}
        </article>
      )}
    </div>
  )
}

export const CanvasNode = memo(View)
