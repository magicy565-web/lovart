"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowDown, Check, CircleDollarSign, Clock3, Factory, FileCheck2, FlaskConical, ImageOff, Loader2, Mail, ShieldCheck, UserRound, UsersRound } from "lucide-react"
import { LogoMark } from "@/components/landing/logo-mark"
import { trackVisit, trackCtaClick, submitEmail, submitEarlyBird } from "@/app/actions/campaign"
import type { CampaignOperatingState, CampaignRuntimeState, CampaignTierAvailability } from "@/features/campaign/contracts"
import type { BriefContent, CampaignContent, CampaignFoundationContent, VisualsContent } from "@/lib/studio/types"
import { cn } from "@/lib/utils"

const TRUTH_CLASS_LABELS: Record<string, string> = {
  generated_concept: "生成概念",
  cad_render: "CAD / 渲染",
  prototype_photo: "样机照片",
  production_sample: "量产样",
  manufacturing_evidence: "制造证据",
  verified_data: "已验证数据",
}

const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  available: "已具备",
  needed: "仍需补齐",
  launch_required: "上线前必需",
  later: "可后补",
}

function formatCampaignDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date)
}

export function CampaignPublicPage({
  projectId,
  campaign,
  visuals,
  brief,
  foundation,
  snapshot,
  runtime,
  operating,
}: {
  projectId: string
  campaign: CampaignContent
  visuals: VisualsContent | null
  brief: BriefContent | null
  foundation: CampaignFoundationContent | null
  snapshot: { id: string; version: number; mode: string; publishedAt: string | Date } | null
  runtime: CampaignRuntimeState | null
  operating: CampaignOperatingState
}) {
  const visitTracked = useRef(false)
  useEffect(() => {
    if (visitTracked.current) return
    visitTracked.current = true
    void trackVisit(projectId)
  }, [projectId])

  const mediaItems = visuals?.items.filter((item) => Boolean(item.src?.trim())) ?? []
  const hero = mediaItems.find((item) => item.key === "hero") ?? mediaItems.find((item) => item.key === "scene") ?? mediaItems[0]
  const explode = mediaItems.find((item) => item.key === "explode")
  const colorways = mediaItems.find((item) => item.key === "colorways")
  const product = mediaItems.find((item) => item.key === "hero")
  const publicationMode = foundation?.readiness.publicationMode ?? "demo"
  const isDemo = publicationMode === "demo"
  const availableEvidence = foundation?.evidence.items.filter((item) => item.status === "available").length ?? 0
  const risks = foundation?.openRisks ?? brief?.risks ?? []
  const productStage = foundation?.delivery.productStage === "production_sample" ? "量产样机" : foundation?.delivery.productStage === "functional_prototype" ? "功能样机" : foundation?.delivery.productStage === "appearance_prototype" ? "外观样机" : "概念阶段"
  const currencySymbol = campaign.currency === "USD" ? "$" : "¥"
  const evidenceCheckpoint = formatCampaignDate(operating.lastEvidenceCheckpoint)
  const snapshotDate = formatCampaignDate(snapshot?.publishedAt)

  return (
    <div className="min-h-dvh bg-background">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="text-sm font-semibold">启物众筹</span>
        </div>
        <div className="flex items-center gap-2"><span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{snapshot ? `SNAPSHOT v${snapshot.version}` : "LEGACY"}</span><span className={cn("rounded-full px-3 py-1 text-xs font-medium", isDemo ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300")}>{isDemo ? "概念验证中" : "发布准备完成"}</span></div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-[#17191c]">
          {hero && (
            <Image src={hero.src} alt={hero.alt} fill priority className="object-cover" sizes="100vw" />
          )}
          {hero ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" aria-hidden />
          ) : (
            <div className="absolute inset-x-6 top-16 flex h-48 items-center justify-center border border-dashed border-white/20 bg-white/[0.03] px-6 text-center md:inset-y-16 md:left-auto md:right-[8vw] md:h-auto md:w-[36vw] md:max-w-lg">
              <div className="max-w-xs">
                <ImageOff className="mx-auto size-8 text-white/45" aria-hidden />
                <p className="mt-4 text-sm font-semibold text-white">产品视觉待补充</p>
                <p className="mt-2 text-xs leading-5 text-white/60">
                  发布者尚未提供已批准的产品图。这里需要一张正面产品图，或明确标注为概念稿的产品视觉。
                </p>
              </div>
            </div>
          )}
          <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-14 text-white">
            <h1 className="font-serif text-4xl text-balance md:text-6xl">{campaign.heroTitle}</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">{campaign.heroSubtitle}</p>
            <a
              href="#tiers"
              onClick={() => void trackCtaClick(projectId)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isDemo ? "预约首发通知" : "查看支持档位"}
              <ArrowDown className="size-4" />
            </a>
          </div>
        </section>

        <section className={cn("border-b px-6 py-4", isDemo ? "border-amber-500/20 bg-amber-500/8" : "border-emerald-500/20 bg-emerald-500/8")}>
          <div className="mx-auto flex max-w-4xl items-start gap-3">
            {isDemo ? <FlaskConical className="mt-0.5 size-5 shrink-0 text-amber-400" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" />}
            <div>
              <p className="text-sm font-semibold">{isDemo ? "当前页面用于验证购买意向，不会收取费用" : "项目已通过基础发布门禁"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{isDemo ? "页面中的性能、认证和交付信息仍可能是目标值。正式众筹前需要补齐可运行原型、成本与供应链证据。" : "支持档位仍以预约为主，实际扣款与交付规则以上线平台和最终证据为准。"}</p>
            </div>
          </div>
        </section>

        {runtime && (
          <section aria-label="预约实况" className="border-b border-border bg-background">
            <div className="mx-auto grid max-w-4xl divide-y divide-border px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
              <div className="flex items-center gap-3 py-5 sm:px-6">
                <UsersRound className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">
                    {runtime.tierReservationCount > 0 ? `${runtime.tierReservationCount} 位已预约` : "预约刚刚开放"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">档位预约，按邮箱去重</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-5 sm:px-6">
                <CircleDollarSign className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {runtime.reservedValue > 0 ? `${currencySymbol}${runtime.reservedValue.toLocaleString()}` : "尚无档位金额"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">意向金额，不代表已收款</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-5 sm:px-6">
                <Mail className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">
                    {runtime.reservationCount > 0 ? `${runtime.reservationCount} 条有效意向` : "等待首批意向"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">通知订阅与档位预约合计</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 问题 / 方案 */}
        <section className="mx-auto grid max-w-4xl gap-6 px-6 py-16 md:grid-cols-2">
          <div className="rounded-2xl bg-secondary p-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">问题</h2>
            <p className="mt-3 text-sm leading-relaxed md:text-base">{campaign.problem}</p>
          </div>
          <div className="rounded-2xl bg-primary/5 p-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-primary">我们的方案</h2>
            <p className="mt-3 text-sm leading-relaxed md:text-base">{campaign.solution}</p>
          </div>
        </section>

        {/* 功能 + 拆解图 */}
        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto grid max-w-4xl items-center gap-10 px-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h2 className="font-serif text-3xl text-balance">{foundation?.product.launchVersion || brief?.tagline || "首发版本关键能力"}</h2>
              {campaign.features.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h3 className="text-sm font-semibold md:text-base">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {explode && (
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image src={explode.src} alt={explode.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
              </div>
            )}
          </div>
        </section>

        {/* 规格 + 配色 */}
        <section className="mx-auto grid max-w-4xl items-center gap-10 px-6 py-16 md:grid-cols-2">
          {colorways && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl max-md:order-2">
              <Image src={colorways.src} alt={colorways.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
            </div>
          )}
          <div>
            <h2 className="font-serif text-3xl">产品规格</h2>
            <dl className="mt-6 flex flex-col gap-3">
              {campaign.specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="text-right font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {foundation && (
          <section className="border-y border-border bg-card py-14">
            <div className="mx-auto max-w-4xl px-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">项目准备度</p>
                  <h2 className="mt-2 font-serif text-3xl">哪些已经确定，哪些仍待证明</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                    {isDemo
                      ? "当前为概念验证页：意向可预约但不收费。下列证据等级与待办对访客公开，避免把目标值当成已验证事实。"
                      : "项目已通过基础发布门禁，下列证据仍以标注范围为准。"}
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    foundation.readiness.status === "go"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : foundation.readiness.status === "conditional_go"
                        ? "bg-amber-400/15 text-amber-300"
                        : "bg-red-400/15 text-red-300",
                  )}>
                    {foundation.readiness.status === "go" ? "GO · 正式发布" : foundation.readiness.status === "conditional_go" ? "CONDITIONAL · 概念验证" : "BLOCKED"}
                  </span>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
                    {foundation.readiness.score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-4">
                  <FlaskConical className="size-5 text-primary" />
                  <p className="mt-4 text-xs text-muted-foreground">产品阶段</p>
                  <p className="mt-1 text-sm font-semibold">{productStage}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <Factory className="size-5 text-primary" />
                  <p className="mt-4 text-xs text-muted-foreground">供应链</p>
                  <p className="mt-1 text-sm font-semibold">
                    {foundation.delivery.supplierStatus === "confirmed"
                      ? "已经确认"
                      : foundation.delivery.supplierStatus === "shortlisted"
                        ? "已有候选"
                        : "尚未确认"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <ShieldCheck className="size-5 text-primary" />
                  <p className="mt-4 text-xs text-muted-foreground">已有证据</p>
                  <p className="mt-1 text-sm font-semibold">
                    {availableEvidence}/{foundation.evidence.items.length} 项
                  </p>
                </div>
              </div>

              {foundation.evidence.items.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <p className="text-sm font-semibold">证据清单与等级</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {foundation.evidence.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-border/80 bg-background/60 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-5">{item.label}</p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              item.status === "available"
                                ? "bg-emerald-400/12 text-emerald-300"
                                : item.status === "launch_required" || item.status === "needed"
                                  ? "bg-amber-400/12 text-amber-300"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {EVIDENCE_STATUS_LABELS[item.status] ?? item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          等级：{TRUTH_CLASS_LABELS[item.truthClass] ?? item.truthClass}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {foundation.readiness.blockers.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-400">
                    <AlertTriangle className="size-4" />
                    当前阻塞项
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {foundation.readiness.blockers.map((item) => (
                      <li key={item} className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {foundation.readiness.nextActions.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="size-4 text-amber-500" />
                    上线前重点任务
                  </p>
                  <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {foundation.readiness.nextActions.slice(0, 8).map((item, index) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        <section aria-label="项目运营状态" className="border-b border-border bg-background py-12">
          <div className="mx-auto max-w-4xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">项目运营状态</p>
              <h2 className="mt-2 font-serif text-3xl text-balance">由谁负责，证据更新到哪里</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                产品叙事来自发布快照；创建者身份、预约和证据检查点来自真实运营记录。
              </p>
            </div>
            <dl className="mt-8 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
              <div className="py-5 lg:px-5 lg:first:pl-0">
                <UserRound className="size-5 text-primary" aria-hidden />
                <dt className="mt-4 text-[11px] text-muted-foreground">创建者</dt>
                <dd className="mt-1 text-sm font-semibold">{operating.creator?.name ?? "创建者资料尚未公开"}</dd>
              </div>
              <div className="border-t border-border py-5 sm:border-l sm:border-t-0 sm:pl-5 lg:border-l-0 lg:px-5">
                <FileCheck2 className="size-5 text-primary" aria-hidden />
                <dt className="mt-4 text-[11px] text-muted-foreground">批准证据</dt>
                <dd className="mt-1 text-sm font-semibold">{operating.approvedEvidenceCount} 项</dd>
                <dd className="mt-1 text-[11px] text-muted-foreground">{evidenceCheckpoint ? `最近 ${evidenceCheckpoint}` : "尚未记录证据检查点"}</dd>
              </div>
              <div className="border-t border-border py-5 sm:border-t lg:border-t-0 lg:px-5">
                <ShieldCheck className="size-5 text-primary" aria-hidden />
                <dt className="mt-4 text-[11px] text-muted-foreground">公开问答</dt>
                <dd className="mt-1 text-sm font-semibold">{operating.faqCount} 项 FAQ</dd>
              </div>
              <div className="border-t border-border py-5 sm:border-l sm:pl-5 lg:border-l-0 lg:border-t-0 lg:px-5 lg:last:pr-0">
                <Clock3 className="size-5 text-primary" aria-hidden />
                <dt className="mt-4 text-[11px] text-muted-foreground">当前公开版本</dt>
                <dd className="mt-1 text-sm font-semibold">{snapshot ? `快照 v${snapshot.version}` : "旧版发布"}</dd>
                <dd className="mt-1 text-[11px] text-muted-foreground">{snapshotDate ?? "发布时间未记录"}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 档位(早鸟预约) */}
        <section id="tiers" className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center font-serif text-3xl text-balance">选择你的支持档位</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              这是非绑定预约，不会扣款；正式量产或众筹开始前可以随时取消
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {campaign.tiers.map((tier, i) => (
                <TierCard
                  key={tier.id ?? tier.name}
                  projectId={projectId}
                  tier={tier}
                  highlighted={i === 0}
                  currencySymbol={currencySymbol}
                  availability={runtime?.tierAvailability.find((item) => item.tierName === tier.name)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 时间线 + FAQ */}
        <section className="mx-auto grid max-w-4xl gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl">交付时间线</h2>
            <ol className="mt-6 flex flex-col gap-4">
              {campaign.timeline.map((t) => (
                <li key={t.date} className="flex gap-4">
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{t.date}</span>
                  <span className="text-sm text-muted-foreground">{t.event}</span>
                </li>
              ))}
            </ol>
            {risks.length > 0 && (
              <div className="mt-8 rounded-xl border border-border p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">风险提示</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {risks.map((r) => (
                    <li key={r} className="text-xs leading-relaxed text-muted-foreground">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-serif text-2xl">常见问题</h2>
            <div className="mt-6 flex flex-col gap-3">
              {campaign.faq.map((f) => (
                <details key={f.q} className="rounded-xl border border-border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 邮箱留资 */}
        <section className="border-t border-border bg-foreground py-16 text-background">
          <div className="mx-auto max-w-xl px-6 text-center">
            {product && (
              <div className="relative mx-auto mb-6 size-24 overflow-hidden rounded-2xl">
                <Image src={product.src} alt={product.alt} fill className="object-cover" sizes="96px" />
              </div>
            )}
            <h2 className="font-serif text-3xl text-balance">第一时间获得发售通知</h2>
            <p className="mt-2 text-sm text-background/70">留下邮箱,量产与发售的每个关键节点我们都会通知你。</p>
            <EmailForm projectId={projectId} />
          </div>
        </section>
      </main>

      <footer className="flex h-14 items-center justify-center border-t border-border text-xs text-muted-foreground">
        由启物生成 · {isDemo ? "概念验证页面，预约但不收费" : "项目信息以已标注证据范围为准"}
      </footer>
    </div>
  )
}

// ---- 档位卡片(早鸟预约) ----

function TierCard({
  projectId,
  tier,
  highlighted,
  currencySymbol,
  availability,
}: {
  projectId: string
  tier: CampaignContent["tiers"][number]
  highlighted: boolean
  currencySymbol: string
  availability?: CampaignTierAvailability
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "pending") return
    setStatus("pending")
    const result = await submitEarlyBird(projectId, email, tier.name, website)
    if (result.ok) {
      setStatus("done")
      router.refresh()
    } else {
      setStatus("error")
      setError("error" in result && typeof result.error === "string" ? result.error : "提交失败,请重试")
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-5",
        highlighted ? "border-primary/60 bg-primary/5" : "border-border bg-background",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{tier.name}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", highlighted && "text-primary")}>
        {currencySymbol}
        {tier.price}
      </p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{tier.description}</p>
      {tier.limit > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {availability?.soldOut
            ? "已约满"
            : availability?.remaining != null
              ? `剩余 ${availability.remaining} / ${tier.limit}`
              : `限量 ${tier.limit} 份`}
        </p>
      )}

      {status === "done" ? (
        <p className="mt-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
          <Check className="size-3.5" />
          已预约,发售时通知你
        </p>
      ) : open ? (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="sr-only"
            aria-hidden="true"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="你的邮箱"
            aria-label={`${tier.name} 预约邮箱`}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={status === "pending"}
            className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {status === "pending" && <Loader2 className="size-3.5 animate-spin" />}
            确认预约
          </button>
          {status === "error" && <p className="text-[10px] text-destructive">{error}</p>}
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          disabled={availability?.soldOut}
          className={cn(
            "mt-4 rounded-full px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-40",
            highlighted ? "bg-primary text-primary-foreground" : "border border-border text-foreground",
          )}
        >
          {availability?.soldOut ? "已约满" : "预约此档位"}
        </button>
      )}
    </div>
  )
}

// ---- 邮箱留资 ----

function EmailForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "pending") return
    setStatus("pending")
    const result = await submitEmail(projectId, email, website)
    if (result.ok) {
      setStatus("done")
    } else {
      setStatus("error")
      setError("error" in result && typeof result.error === "string" ? result.error : "提交失败,请重试")
    }
  }

  if (status === "done") {
    return (
      <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-background/10 px-5 py-2.5 text-sm">
        <Check className="size-4 text-primary" />
        已登记,感谢你的关注
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto mt-6 flex max-w-sm items-center gap-2">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-2.5">
        <Mail className="size-4 shrink-0 text-background/50" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="你的邮箱"
          aria-label="邮箱"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-background/40"
        />
      </div>
      <button
        type="submit"
        disabled={status === "pending"}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {status === "pending" && <Loader2 className="size-4 animate-spin" />}
        订阅
      </button>
      {status === "error" && (
        <p className="absolute left-0 right-0 top-full mt-2 text-center text-xs text-red-300">{error}</p>
      )}
    </form>
  )
}
