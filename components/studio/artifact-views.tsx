"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type {
  BriefContent,
  CampaignContent,
  ValidationContent,
  VisualsContent,
} from "@/lib/studio/types"

// ---- 可编辑文本(点击即改,失焦保存) ----

function EditableText({
  value,
  onSave,
  as = "p",
  className,
  multiline = false,
  label,
}: {
  value: string
  onSave: (next: string) => void
  as?: "p" | "h2" | "h3" | "span"
  className?: string
  multiline?: boolean
  label: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    const commit = () => {
      setEditing(false)
      if (draft.trim() && draft !== value) onSave(draft.trim())
      else setDraft(value)
    }
    return multiline ? (
      <textarea
        autoFocus
        aria-label={label}
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className={cn("w-full resize-none rounded-md border border-primary/50 bg-background p-2 outline-none", className)}
      />
    ) : (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) commit()
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={cn("w-full rounded-md border border-primary/50 bg-background px-2 py-1 outline-none", className)}
      />
    )
  }

  const Tag = as
  return (
    <Tag
      role="button"
      tabIndex={0}
      title="点击编辑"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setDraft(value)
          setEditing(true)
        }
      }}
      className={cn(
        "cursor-text rounded-md px-1 -mx-1 transition-colors hover:bg-primary/5 hover:outline hover:outline-1 hover:outline-dashed hover:outline-primary/40",
        className,
      )}
    >
      {value}
    </Tag>
  )
}

// ---- 1. Product Brief ----

export function BriefView({
  content,
  onChange,
}: {
  content: BriefContent
  onChange: (next: BriefContent) => void
}) {
  const listSection = (title: string, key: "painPoints" | "sellingPoints" | "risks") => (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {content[key].map((item, i) => (
          <li key={`${key}-${i}`} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" aria-hidden />
            <EditableText
              label={`${title} ${i + 1}`}
              value={item}
              onSave={(next) => {
                const list = [...content[key]]
                list[i] = next
                onChange({ ...content, [key]: list })
              }}
              className="flex-1"
            />
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <EditableText
          label="产品名称"
          as="h2"
          value={content.productName}
          onSave={(next) => onChange({ ...content, productName: next })}
          className="font-serif text-2xl text-foreground"
        />
        <EditableText
          label="产品标语"
          value={content.tagline}
          onSave={(next) => onChange({ ...content, tagline: next })}
          className="mt-1 text-sm text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 rounded-xl bg-secondary p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">目标人群</p>
          <EditableText
            label="目标人群"
            value={content.audience}
            onSave={(next) => onChange({ ...content, audience: next })}
            className="mt-1 text-sm leading-relaxed"
            multiline
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">产品形态</p>
          <EditableText
            label="产品形态"
            value={content.form}
            onSave={(next) => onChange({ ...content, form: next })}
            className="mt-1 text-sm leading-relaxed"
            multiline
          />
        </div>
      </div>

      {listSection("用户痛点", "painPoints")}
      {listSection("核心卖点", "sellingPoints")}

      <div className="flex gap-6">
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">建议零售价</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">¥{content.retailPrice}</p>
        </div>
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <p className="text-xs text-primary">早鸟价</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-primary">¥{content.earlyBirdPrice}</p>
        </div>
      </div>

      {listSection("风险提示", "risks")}
    </div>
  )
}

// ---- 2. Visual Kit ----

export function VisualsView({ content }: { content: VisualsContent }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        风格方向:<span className="text-foreground">{content.style}</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        {content.items.map((item) => (
          <figure key={item.key} className="group relative overflow-hidden rounded-xl border border-border bg-secondary">
            <div className="relative aspect-[4/3]">
              <Image src={item.src || "/placeholder.svg"} alt={item.alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 30vw" />
            </div>
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {item.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

// ---- 3. Campaign Page(所见即所得预览,文本可编辑) ----

export function CampaignView({
  content,
  visuals,
  onChange,
}: {
  content: CampaignContent
  visuals: VisualsContent | null
  onChange: (next: CampaignContent) => void
}) {
  const hero = visuals?.items.find((v) => v.key === "scene") ?? visuals?.items[0]
  const currencySymbol = content.currency === "USD" ? "$" : "¥"

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {/* Hero */}
        <div className="relative aspect-[16/8]">
          {hero && <Image src={hero.src || "/placeholder.svg"} alt={hero.alt} fill className="object-cover" sizes="60vw" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <EditableText
              label="众筹页主标题"
              as="h2"
              value={content.heroTitle}
              onSave={(next) => onChange({ ...content, heroTitle: next })}
              className="font-serif text-3xl"
            />
            <EditableText
              label="众筹页副标题"
              value={content.heroSubtitle}
              onSave={(next) => onChange({ ...content, heroSubtitle: next })}
              className="mt-2 max-w-xl text-sm leading-relaxed text-white/85"
              multiline
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 p-6">
          {/* 问题与方案 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-secondary p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">问题</h3>
              <EditableText
                label="问题描述"
                value={content.problem}
                onSave={(next) => onChange({ ...content, problem: next })}
                className="mt-2 text-sm leading-relaxed"
                multiline
              />
            </div>
            <div className="rounded-xl bg-primary/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-primary">方案</h3>
              <EditableText
                label="方案描述"
                value={content.solution}
                onSave={(next) => onChange({ ...content, solution: next })}
                className="mt-2 text-sm leading-relaxed"
                multiline
              />
            </div>
          </div>

          {/* 核心功能 */}
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">核心功能</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {content.features.map((f, i) => (
                <div key={`feature-${i}`} className="rounded-xl border border-border p-4">
                  <EditableText
                    label={`功能 ${i + 1} 标题`}
                    as="h3"
                    value={f.title}
                    onSave={(next) => {
                      const features = [...content.features]
                      features[i] = { ...f, title: next }
                      onChange({ ...content, features })
                    }}
                    className="text-sm font-semibold"
                  />
                  <EditableText
                    label={`功能 ${i + 1} 描述`}
                    value={f.description}
                    onSave={(next) => {
                      const features = [...content.features]
                      features[i] = { ...f, description: next }
                      onChange({ ...content, features })
                    }}
                    className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
                    multiline
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 规格 */}
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">产品规格</h3>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {content.specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 border-b border-border/60 pb-2 text-sm">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="text-right">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 档位 */}
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">众筹档位</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {content.tiers.map((tier, i) => (
                <div
                  key={tier.name}
                  className={cn(
                    "rounded-xl border p-4",
                    i === 0 ? "border-primary/50 bg-primary/5" : "border-border",
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">{tier.name}</p>
                  <p className={cn("mt-1 text-xl font-semibold tabular-nums", i === 0 && "text-primary")}>
                    {currencySymbol}{tier.price}
                  </p>
                  <EditableText
                    label={`${tier.name} 描述`}
                    value={tier.description}
                    onSave={(next) => {
                      const tiers = [...content.tiers]
                      tiers[i] = { ...tier, description: next }
                      onChange({ ...content, tiers })
                    }}
                    className="mt-2 text-xs leading-relaxed text-muted-foreground"
                    multiline
                  />
                  {tier.limit > 0 && <p className="mt-2 text-[10px] text-muted-foreground">限量 {tier.limit} 份</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 时间线 + FAQ */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">交付时间线</h3>
              <ol className="flex flex-col gap-2">
                {content.timeline.map((t) => (
                  <li key={t.date} className="flex gap-3 text-sm">
                    <span className="shrink-0 font-medium tabular-nums text-primary">{t.date}</span>
                    <span className="text-muted-foreground">{t.event}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">常见问题</h3>
              <div className="flex flex-col gap-2">
                {content.faq.map((f, i) => (
                  <details key={`faq-${i}`} className="rounded-lg border border-border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- 4. Validation Setup ----

export function ValidationView({
  content,
  onChange,
}: {
  content: ValidationContent
  onChange: (next: ValidationContent) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        选择发布页上开启的验证方式。发布后,每一次留资和预约都会成为真实的购买意愿信号。
      </p>
      <div className="flex flex-col gap-2">
        {content.methods.map((m, i) => (
          <label
            key={m.key}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors",
              m.enabled ? "border-primary/50 bg-primary/5" : "border-border",
            )}
          >
            <span className="text-sm font-medium">{m.label}</span>
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) => {
                const methods = [...content.methods]
                methods[i] = { ...m, enabled: e.target.checked }
                onChange({ ...content, methods })
              }}
              className="size-4 accent-primary"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
