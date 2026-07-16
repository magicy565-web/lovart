"use client"

import type { ReactNode } from "react"
import {
  AlignBottomIcon,
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  ArrowLineDownIcon,
  ArrowLineUpIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsOutLineVerticalIcon,
  CaretDownIcon,
  CaretUpIcon,
  CopySimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react"
import { useCanvasStore, type AlignMode, type CanvasItemType } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

const typeLabels: Record<CanvasItemType, string> = {
  image: "图像",
  video: "视频",
  text: "文字",
  frame: "画框",
  generator: "生成器",
  rectangle: "矩形",
  ellipse: "椭圆",
  line: "线条",
  arrow: "箭头",
  star: "星形",
  polygon: "多边形",
  drawing: "绘制",
  brief: "产品简报",
  research: "市场调研",
  "competitor-style": "竞品视觉板",
  "design-reinforcement": "设计强化",
}

const shapeTypes: CanvasItemType[] = ["rectangle", "ellipse", "line", "arrow", "star", "polygon", "drawing"]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border px-3 py-3 first:border-t-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5 focus-within:ring-1 focus-within:ring-primary">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-[12px] tabular-nums text-foreground outline-none"
      />
    </label>
  )
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 flex-1 items-center justify-center rounded-lg transition-colors",
        active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed text-foreground/25 hover:bg-transparent hover:text-foreground/25",
      )}
    >
      {children}
    </button>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-5 shrink-0 cursor-pointer rounded-full border border-border bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
      />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="ml-auto text-[11px] tabular-nums uppercase text-foreground/70">{value}</span>
    </div>
  )
}

export function Inspector() {
  const items = useCanvasStore((s) => s.items)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const update = useCanvasStore((s) => s.updateItem)
  const align = useCanvasStore((s) => s.alignSelected)
  const layer = useCanvasStore((s) => s.moveLayer)
  const toggleLocked = useCanvasStore((s) => s.toggleLocked)
  const toggleHidden = useCanvasStore((s) => s.toggleHidden)
  const duplicate = useCanvasStore((s) => s.duplicateSelected)
  const remove = useCanvasStore((s) => s.removeSelected)

  const picked = items.filter((i) => selectedIds.includes(i.id))
  if (picked.length === 0) return null

  const single = picked.length === 1 ? picked[0] : null
  const multi = picked.length
  const isText = single?.type === "text"
  const isShape = !!single && shapeTypes.includes(single.type)
  const anyLocked = picked.some((i) => i.locked)
  const anyHidden = picked.some((i) => i.hidden)

  const alignButtons: { mode: AlignMode; label: string; icon: ReactNode }[] = [
    { mode: "left", label: "左对齐", icon: <AlignLeftIcon size={16} /> },
    { mode: "centerX", label: "水平居中", icon: <AlignCenterVerticalIcon size={16} /> },
    { mode: "right", label: "右对齐", icon: <AlignRightIcon size={16} /> },
    { mode: "top", label: "顶对齐", icon: <AlignTopIcon size={16} /> },
    { mode: "centerY", label: "垂直居中", icon: <AlignCenterHorizontalIcon size={16} /> },
    { mode: "bottom", label: "底对齐", icon: <AlignBottomIcon size={16} /> },
  ]

  return (
    <aside
      aria-label="属性面板"
      className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[240px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_18px_48px_-12px_rgba(0,0,0,0.22)]"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[10px] font-semibold uppercase">
          {single ? typeLabels[single.type].slice(0, 1) : multi}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {single ? single.title : `${multi} 个对象`}
          </p>
          {single && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {typeLabels[single.type]} · {Math.round(single.width)} × {Math.round(single.height)}
            </p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {single && (
          <Section title="位置与尺寸">
            <div className="flex gap-2">
              <NumberField label="X" value={single.x} onChange={(v) => update(single.id, { x: v })} />
              <NumberField label="Y" value={single.y} onChange={(v) => update(single.id, { y: v })} />
            </div>
            <div className="flex gap-2">
              <NumberField label="W" value={single.width} min={8} onChange={(v) => update(single.id, { width: Math.max(8, v) })} />
              <NumberField label="H" value={single.height} min={8} onChange={(v) => update(single.id, { height: Math.max(8, v) })} />
            </div>
          </Section>
        )}

        {multi > 1 && (
          <Section title="对齐与分布">
            <div className="flex gap-1">
              {alignButtons.map((b) => (
                <IconButton key={b.mode} label={b.label} onClick={() => align(b.mode)}>
                  {b.icon}
                </IconButton>
              ))}
            </div>
            {multi > 2 && (
              <div className="flex gap-1">
                <IconButton label="水平等距分布" onClick={() => align("distributeX")}>
                  <ArrowsOutLineHorizontalIcon size={16} />
                </IconButton>
                <IconButton label="垂直等距分布" onClick={() => align("distributeY")}>
                  <ArrowsOutLineVerticalIcon size={16} />
                </IconButton>
              </div>
            )}
          </Section>
        )}

        {isText && single && (
          <Section title="文字">
            <div className="flex gap-2">
              <NumberField label="字号" value={single.fontSize ?? 24} min={10} max={200} onChange={(v) => update(single.id, { fontSize: v })} />
              <label className="flex flex-1 items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">字重</span>
                <select
                  aria-label="字重"
                  value={single.fontWeight ?? 500}
                  onChange={(e) => update(single.id, { fontWeight: Number(e.target.value) })}
                  className="w-full bg-transparent text-[12px] text-foreground outline-none"
                >
                  <option value={400}>常规</option>
                  <option value={500}>中等</option>
                  <option value={600}>半粗</option>
                  <option value={700}>加粗</option>
                </select>
              </label>
            </div>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <IconButton
                  key={a}
                  label={a === "left" ? "左对齐" : a === "center" ? "居中" : "右对齐"}
                  active={(single.align ?? "left") === a}
                  onClick={() => update(single.id, { align: a })}
                >
                  {a === "left" ? <TextAlignLeftIcon size={16} /> : a === "center" ? <TextAlignCenterIcon size={16} /> : <TextAlignRightIcon size={16} />}
                </IconButton>
              ))}
            </div>
            <ColorField label="颜色" value={single.stroke ?? "#1f1f1f"} onChange={(v) => update(single.id, { stroke: v })} />
          </Section>
        )}

        {isShape && single && (
          <Section title="外观">
            <ColorField label="填充" value={single.fill?.startsWith("#") ? single.fill : "#ffffff"} onChange={(v) => update(single.id, { fill: v })} />
            <ColorField label="描边" value={single.stroke ?? "#1f1f1f"} onChange={(v) => update(single.id, { stroke: v })} />
            <NumberField label="描边宽度" value={single.strokeWidth ?? 2} min={0} max={40} onChange={(v) => update(single.id, { strokeWidth: v })} />
          </Section>
        )}

        <Section title="排列">
          <div className="flex gap-1">
            <IconButton label="置于顶层" onClick={() => layer("front")}>
              <ArrowLineUpIcon size={16} />
            </IconButton>
            <IconButton label="上移一层" onClick={() => layer("up")}>
              <CaretUpIcon size={16} />
            </IconButton>
            <IconButton label="下移一层" onClick={() => layer("down")}>
              <CaretDownIcon size={16} />
            </IconButton>
            <IconButton label="置于底层" onClick={() => layer("back")}>
              <ArrowLineDownIcon size={16} />
            </IconButton>
          </div>
        </Section>

        <Section title="操作">
          <div className="flex gap-1">
            <IconButton label={anyLocked ? "解锁" : "锁定"} active={anyLocked} onClick={toggleLocked}>
              {anyLocked ? <LockSimpleIcon size={16} weight="fill" /> : <LockSimpleOpenIcon size={16} />}
            </IconButton>
            <IconButton label={anyHidden ? "显示" : "隐藏"} active={anyHidden} onClick={toggleHidden}>
              {anyHidden ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
            </IconButton>
            <IconButton label="复制副本" onClick={duplicate}>
              <CopySimpleIcon size={16} />
            </IconButton>
            <IconButton label="删除" onClick={remove}>
              <TrashSimpleIcon size={16} />
            </IconButton>
          </div>
        </Section>
      </div>
    </aside>
  )
}
