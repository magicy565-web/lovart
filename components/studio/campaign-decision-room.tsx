"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  CircleGauge,
  Copy,
  ExternalLink,
  Factory,
  GitMerge,
  Loader2,
  Palette,
  PackageCheck,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

import { approveFoundationAndPublishConcept, saveCampaignFoundation, synthesizeCampaignFoundationDecision } from "@/app/actions/studio"
import { Button } from "@/components/ui/button"
import { CampaignEvidencePanel } from "@/components/studio/campaign-evidence-panel"
import { evaluateCampaignReadiness, withEvaluatedReadiness } from "@/lib/studio/campaign-foundation"
import type {
  CampaignDirection,
  CampaignFoundationContent,
} from "@/lib/studio/types"
import { cn } from "@/lib/utils"

const routeTone = {
  "route-a": { border: "border-teal-500/40", active: "border-teal-600 bg-teal-50", badge: "bg-teal-600", text: "text-teal-700" },
  "route-b": { border: "border-blue-500/35", active: "border-blue-600 bg-blue-50", badge: "bg-blue-600", text: "text-blue-700" },
  "route-c": { border: "border-orange-500/40", active: "border-orange-600 bg-orange-50", badge: "bg-orange-600", text: "text-orange-700" },
} as const

const inputClass = "h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/35 focus:ring-2 focus:ring-black/5"
const textareaClass = "min-h-20 w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-black/35 focus:ring-2 focus:ring-black/5"

function splitList(value: string) {
  return value.split(/[\n,，、]/).map((item) => item.trim()).filter(Boolean)
}

function TextListField({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (next: string[]) => void; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-black/55">{label}</span>
      <textarea className={textareaClass} value={value.join("、")} onChange={(event) => onChange(splitList(event.target.value))} />
      {hint && <span className="text-[11px] text-black/40">{hint}</span>}
    </label>
  )
}

function DecisionSection({ icon: Icon, index, title, description, children }: {
  icon: typeof Target
  index: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-black/10 py-7 first:border-t-0 first:pt-0">
      <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div>
          <span className="flex size-9 items-center justify-center rounded-lg border border-black/10 bg-white text-black/70"><Icon className="size-4" /></span>
          <p className="mt-3 font-mono text-[10px] text-black/35">DECISION {index}</p>
          <h3 className="mt-1 text-base font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-black/50">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[72px_1fr_16px] items-center gap-2 text-[10px] text-black/45">
      <span>{label}</span>
      <span className="flex gap-1" aria-label={`${label} ${value}/5`}>
        {Array.from({ length: 5 }, (_, index) => <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < value ? "bg-current" : "bg-black/10")} />)}
      </span>
      <span className="font-mono text-black/55">{value}</span>
    </div>
  )
}

function DirectionCard({ direction, selected, onToggle }: { direction: CampaignDirection; selected: boolean; onToggle: () => void }) {
  const tone = routeTone[direction.id]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex min-h-[420px] flex-col rounded-lg border bg-white p-4 text-left shadow-[0_8px_24px_-20px_rgba(0,0,0,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(0,0,0,0.45)]",
        selected ? tone.active : tone.border,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white", tone.badge)}>{direction.code}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{direction.title}</h3>
            <span className={cn("ml-auto flex size-5 items-center justify-center rounded-full border", selected ? "border-current bg-white" : "border-black/15 text-transparent", tone.text)}><Check className="size-3" /></span>
          </div>
          <p className="mt-0.5 text-xs text-black/45">{direction.archetype}</p>
        </div>
      </div>
      <p className="mt-4 min-h-16 text-sm leading-6 text-black/70">{direction.thesis}</p>
      <dl className="mt-4 grid gap-3 text-xs">
        <div><dt className="text-black/40">目标用户</dt><dd className="mt-1 line-clamp-2 leading-5 text-black/70">{direction.targetAudience}</dd></div>
        <div><dt className="text-black/40">核心购买理由</dt><dd className="mt-1 line-clamp-2 leading-5 text-black/70">{direction.purchaseReason}</dd></div>
        <div><dt className="text-black/40">视觉方向</dt><dd className="mt-1 line-clamp-2 leading-5 text-black/70">{direction.visualDirection}</dd></div>
        <div><dt className="text-black/40">Offer</dt><dd className="mt-1 line-clamp-2 leading-5 text-black/70">{direction.offerStrategy}</dd></div>
      </dl>
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-black/8 py-3 text-center">
        <div><p className="text-[10px] text-black/40">早鸟</p><p className="mt-0.5 font-mono text-sm font-semibold">¥{direction.earlyBirdPrice}</p></div>
        <div><p className="text-[10px] text-black/40">众筹</p><p className="mt-0.5 font-mono text-sm font-semibold">¥{direction.campaignPrice}</p></div>
        <div><p className="text-[10px] text-black/40">零售</p><p className="mt-0.5 font-mono text-sm font-semibold">¥{direction.retailPrice}</p></div>
      </div>
      <div className={cn("mt-4 grid gap-1.5", tone.text)}>
        <ScoreRow label="市场潜力" value={direction.scores.marketPotential} />
        <ScoreRow label="差异化" value={direction.scores.differentiation} />
        <ScoreRow label="传播潜力" value={direction.scores.contentPotential} />
        <ScoreRow label="可交付性" value={direction.scores.feasibility} />
        <ScoreRow label="众筹适配" value={direction.scores.crowdfundingFit} />
      </div>
      <div className="mt-auto pt-4 text-[11px] leading-5 text-black/45">
        <p>推荐理由：{direction.recommendation}</p>
        <p className="mt-1">主要风险：{direction.risks.join("；")}</p>
      </div>
    </button>
  )
}

export function CampaignDecisionRoom({ projectId, content, onSaved, onPublished, signalCounts, intentLeads }: {
  projectId: string
  content: CampaignFoundationContent
  onSaved: () => Promise<unknown> | unknown
  onPublished?: (result: { slug: string; path: string; mode: string; version: number; summary: string }) => void
  signalCounts?: Record<string, number>
  intentLeads?: Array<{
    id: string
    maskedEmail: string
    tierName: string
    kind: "email" | "earlybird"
    status: string
    createdAt: string
  }>
}) {
  const [draft, setDraft] = useState(() => withEvaluatedReadiness(content))
  const [selectedIds, setSelectedIds] = useState(content.selection.selectedDirectionIds)
  const [instruction, setInstruction] = useState(content.selection.instruction)
  const [busy, setBusy] = useState<"synthesize" | "save" | "publish" | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [published, setPublished] = useState<{
    slug: string
    path: string
    mode: string
    version: number
    summary: string
  } | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")

  useEffect(() => {
    setDraft(withEvaluatedReadiness(content))
    setSelectedIds(content.selection.selectedDirectionIds)
    setInstruction(content.selection.instruction)
  }, [content])

  const readiness = useMemo(() => evaluateCampaignReadiness(draft), [draft])
  const display = useMemo(() => ({ ...draft, readiness }), [draft, readiness])

  function toggleDirection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function synthesize() {
    if (!selectedIds.length || busy) return
    setBusy("synthesize")
    setError("")
    setNotice("")
    try {
      const result = await synthesizeCampaignFoundationDecision(projectId, selectedIds, instruction)
      setDraft(result.content)
      setSelectedIds(result.content.selection.selectedDirectionIds)
      setNotice("组合方案已生成，并保存为新的 Foundation 版本。")
      await onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "组合方案生成失败")
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (busy) return
    setBusy("save")
    setError("")
    setNotice("")
    try {
      const result = await saveCampaignFoundation(projectId, display)
      setDraft(result.content)
      setNotice("六项定案已保存，等待最终批准。")
      await onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败")
    } finally {
      setBusy(null)
    }
  }

  async function publishConcept() {
    if (busy) return
    if (readiness.status === "blocked") {
      setError(`当前定案仍被阻塞：${readiness.blockers.join("；")}`)
      return
    }
    setBusy("publish")
    setError("")
    setNotice("")
    setCopyState("idle")
    try {
      const result = await approveFoundationAndPublishConcept(projectId, display)
      setDraft(withEvaluatedReadiness(display))
      setPublished(result)
      setNotice(`概念验证页已发布 v${result.version} · ${result.mode === "live" ? "正式版" : "概念验证"}`)
      await onSaved()
      onPublished?.(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发布概念验证页失败")
    } finally {
      setBusy(null)
    }
  }

  const publicPath = published ? `/campaign/${published.slug}` : null
  const publicUrl = publicPath && typeof window !== "undefined"
    ? `${window.location.origin}${publicPath}`
    : publicPath

  async function copyShareLink() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyState("copied")
      window.setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("failed")
      window.setTimeout(() => setCopyState("idle"), 2500)
    }
  }

  function openPublicPage() {
    if (!publicPath) return
    window.open(publicPath, "_blank", "noopener,noreferrer")
  }

  const currencySymbol = display.offer.currency === "USD" ? "$" : "¥"

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f4] text-[#1d2420]">
      <header className="shrink-0 border-b border-black/10 bg-white px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-black/40">CAMPAIGN DECISION ROOM</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">众筹立项与产品定案</h2>
            <p className="mt-1 text-xs leading-5 text-black/50">先比较路线，再锁定产品、用户、故事、Offer、证明和交付边界。</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-[#f7f7f4] px-3 py-2">
            <CircleGauge className="size-4 text-black/55" />
            <div><p className="text-[10px] text-black/40">当前可信度</p><p className="font-mono text-sm font-semibold">{readiness.score}/100</p></div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-black/10 bg-[radial-gradient(circle_at_50%_20%,rgba(35,145,125,0.08),transparent_42%)] px-4 py-6 sm:px-7">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-teal-700" /><h3 className="text-sm font-semibold">候选路线</h3><span className="text-xs text-black/40">可单选，也可组合</span></div>
            <div className="grid gap-4 lg:grid-cols-3">
              {display.directions.map((direction) => <DirectionCard key={direction.id} direction={direction} selected={selectedIds.includes(direction.id)} onToggle={() => toggleDirection(direction.id)} />)}
            </div>
            <div className="mt-5 grid gap-3 rounded-lg border border-black/10 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-black/55"><GitMerge className="size-3.5" />组合指令</span>
                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="例如：保留 A 的实用卖点，采用 B 的视觉语言，众筹价控制在 79 美元以内。"
                  className="min-h-16 resize-y rounded-lg border border-black/10 bg-[#fafbfa] px-3 py-2 text-sm outline-none focus:border-black/30"
                />
              </label>
              <Button className="h-9 bg-[#1f7f73] px-4 text-white hover:bg-[#17675e]" disabled={!selectedIds.length || busy !== null} onClick={() => void synthesize()}>
                {busy === "synthesize" ? <Loader2 className="animate-spin" /> : <Sparkles />}
                合成最终方案
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-7 sm:px-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 bg-white px-4 py-6 sm:px-6">
            <DecisionSection icon={PackageCheck} index="01" title="产品版本定案" description="把首发版本收敛为可以生产和交付的范围。">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">产品名称</span><input className={inputClass} value={display.product.workingName} onChange={(event) => setDraft({ ...display, product: { ...display.product, workingName: event.target.value } })} /></label>
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">产品类别 / 形态</span><input className={inputClass} value={display.product.category} onChange={(event) => setDraft({ ...display, product: { ...display.product, category: event.target.value } })} /></label>
                <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-medium text-black/55">首发版本</span><input className={inputClass} value={display.product.launchVersion} onChange={(event) => setDraft({ ...display, product: { ...display.product, launchVersion: event.target.value } })} /></label>
                <TextListField label="首发必须保留" value={display.product.launchFeatures} onChange={(value) => setDraft({ ...display, product: { ...display.product, launchFeatures: value } })} />
                <TextListField label="首发明确排除" value={display.product.excludedFeatures} onChange={(value) => setDraft({ ...display, product: { ...display.product, excludedFeatures: value } })} />
                <div className="sm:col-span-2"><TextListField label="颜色、规格与套装" value={display.product.variants} onChange={(value) => setDraft({ ...display, product: { ...display.product, variants: value } })} /></div>
              </div>
            </DecisionSection>

            <DecisionSection icon={Users} index="02" title="核心用户定案" description="页面只围绕第一核心支持者建立，避免宽泛人群。">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-medium text-black/55">第一核心人群</span><textarea className={textareaClass} value={display.audience.primarySegment} onChange={(event) => setDraft({ ...display, audience: { ...display.audience, primarySegment: event.target.value } })} /></label>
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">典型场景</span><textarea className={textareaClass} value={display.audience.coreSituation} onChange={(event) => setDraft({ ...display, audience: { ...display.audience, coreSituation: event.target.value } })} /></label>
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">当前替代方案</span><textarea className={textareaClass} value={display.audience.currentAlternative} onChange={(event) => setDraft({ ...display, audience: { ...display.audience, currentAlternative: event.target.value } })} /></label>
                <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-medium text-black/55">购买动机</span><textarea className={textareaClass} value={display.audience.purchaseMotivation} onChange={(event) => setDraft({ ...display, audience: { ...display.audience, purchaseMotivation: event.target.value } })} /></label>
              </div>
            </DecisionSection>

            <DecisionSection icon={Target} index="03" title="众筹故事定案" description="确定页面、视频和广告共同使用的核心命题。">
              <div className="grid gap-4">
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">故事类型</span><input className={inputClass} value={display.story.type} onChange={(event) => setDraft({ ...display, story: { ...display.story, type: event.target.value } })} /></label>
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">众筹核心命题</span><textarea className={textareaClass} value={display.story.thesis} onChange={(event) => setDraft({ ...display, story: { ...display.story, thesis: event.target.value } })} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5"><span className="flex items-center gap-1.5 text-xs font-medium text-black/55"><Palette className="size-3.5" />视觉气质</span><textarea className={textareaClass} value={display.visualDirection.mood} onChange={(event) => setDraft({ ...display, visualDirection: { ...display.visualDirection, mood: event.target.value } })} /></label>
                  <div className="grid gap-3">
                    <TextListField label="色彩方向" value={display.visualDirection.palette} onChange={(value) => setDraft({ ...display, visualDirection: { ...display.visualDirection, palette: value } })} />
                    <div className="flex flex-wrap gap-2">{display.visualDirection.palette.map((color, index) => <span key={`${color}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#f7f7f4] px-2 py-1 text-[10px]"><span className={cn("size-2.5 rounded-full", index % 3 === 0 ? "bg-[#303735]" : index % 3 === 1 ? "bg-[#f0eee8]" : "bg-[#d56b3f]")} />{color}</span>)}</div>
                  </div>
                </div>
              </div>
            </DecisionSection>

            <DecisionSection icon={BadgeDollarSign} index="04" title="Offer 与价格定案" description="先确定用户支持什么，再让页面表达这个 Offer。">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">币种</span><select className={inputClass} value={display.offer.currency} onChange={(event) => setDraft({ ...display, offer: { ...display.offer, currency: event.target.value as "CNY" | "USD" } })}><option value="CNY">CNY</option><option value="USD">USD</option></select></label>
                  {(["earlyBirdPrice", "campaignPrice", "retailPrice"] as const).map((key) => <label key={key} className="grid gap-1.5"><span className="text-xs font-medium text-black/55">{key === "earlyBirdPrice" ? "早鸟价" : key === "campaignPrice" ? "众筹价" : "未来零售价"}</span><div className="relative"><span className="absolute left-3 top-2 text-sm text-black/35">{currencySymbol}</span><input type="number" min="1" className={cn(inputClass, "pl-7")} value={display.offer[key]} onChange={(event) => setDraft({ ...display, offer: { ...display.offer, [key]: Number(event.target.value) } })} /></div></label>)}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                    <thead><tr className="border-b border-black/10 text-black/40"><th className="py-2 font-medium">档位</th><th className="py-2 font-medium">价格</th><th className="py-2 font-medium">包含内容</th><th className="py-2 font-medium">限量</th><th className="py-2 font-medium">预计交付</th></tr></thead>
                    <tbody>{display.offer.rewardTiers.map((tier, index) => <tr key={tier.id} className="border-b border-black/8 last:border-b-0">
                      <td className="py-2 pr-2"><input className={inputClass} value={tier.name} onChange={(event) => { const rewardTiers = [...display.offer.rewardTiers]; rewardTiers[index] = { ...tier, name: event.target.value }; setDraft({ ...display, offer: { ...display.offer, rewardTiers } }) }} /></td>
                      <td className="py-2 pr-2"><input type="number" min="1" className={inputClass} value={tier.price} onChange={(event) => { const rewardTiers = [...display.offer.rewardTiers]; rewardTiers[index] = { ...tier, price: Number(event.target.value) }; setDraft({ ...display, offer: { ...display.offer, rewardTiers } }) }} /></td>
                      <td className="py-2 pr-2"><input className={inputClass} value={tier.contents.join("、")} onChange={(event) => { const rewardTiers = [...display.offer.rewardTiers]; rewardTiers[index] = { ...tier, contents: splitList(event.target.value) }; setDraft({ ...display, offer: { ...display.offer, rewardTiers } }) }} /></td>
                      <td className="py-2 pr-2"><input type="number" min="0" className={inputClass} value={tier.capacity} onChange={(event) => { const rewardTiers = [...display.offer.rewardTiers]; rewardTiers[index] = { ...tier, capacity: Number(event.target.value) }; setDraft({ ...display, offer: { ...display.offer, rewardTiers } }) }} /></td>
                      <td className="py-2"><input className={inputClass} value={tier.estimatedDelivery} onChange={(event) => { const rewardTiers = [...display.offer.rewardTiers]; rewardTiers[index] = { ...tier, estimatedDelivery: event.target.value }; setDraft({ ...display, offer: { ...display.offer, rewardTiers } }) }} /></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </div>
            </DecisionSection>

            <DecisionSection icon={ShieldCheck} index="05" title="信任证明定案" description="明确已有证据、缺口和上线前必须完成的证明。">
              <CampaignEvidencePanel
                projectId={projectId}
                requirements={display.evidence.items}
                onFoundationUpdated={(content) => { setDraft(content); void onSaved() }}
              />
            </DecisionSection>

            <DecisionSection icon={Factory} index="06" title="可交付性定案" description="决定项目能否进入正式发布，还是只能做概念验证。">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">产品阶段</span><select className={inputClass} value={display.delivery.productStage} onChange={(event) => setDraft({ ...display, delivery: { ...display.delivery, productStage: event.target.value as CampaignFoundationContent["delivery"]["productStage"] } })}><option value="concept">概念</option><option value="appearance_prototype">外观样机</option><option value="functional_prototype">功能样机</option><option value="production_sample">量产样机</option></select></label>
                <label className="grid gap-1.5"><span className="text-xs font-medium text-black/55">供应商状态</span><select className={inputClass} value={display.delivery.supplierStatus} onChange={(event) => setDraft({ ...display, delivery: { ...display.delivery, supplierStatus: event.target.value as CampaignFoundationContent["delivery"]["supplierStatus"] } })}><option value="unknown">尚未确认</option><option value="shortlisted">已有候选</option><option value="confirmed">已经确认</option></select></label>
                {(["costRange", "moq", "certification", "productionLeadTime"] as const).map((key) => <label key={key} className="grid gap-1.5"><span className="text-xs font-medium text-black/55">{{ costRange: "核心成本范围", moq: "最低起订量", certification: "认证需求", productionLeadTime: "预计生产周期" }[key]}</span><input className={inputClass} value={display.delivery[key]} onChange={(event) => setDraft({ ...display, delivery: { ...display.delivery, [key]: event.target.value } })} /></label>)}
                <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-medium text-black/55">包装、物流与履约方案</span><textarea className={textareaClass} value={display.delivery.fulfillmentPlan} onChange={(event) => setDraft({ ...display, delivery: { ...display.delivery, fulfillmentPlan: event.target.value } })} /></label>
                <div className="sm:col-span-2"><TextListField label="开放风险" value={display.openRisks} onChange={(value) => setDraft({ ...display, openRisks: value })} hint="风险不会自动消失；这里记录尚未解决但已明确的事项。" /></div>
              </div>
            </DecisionSection>
          </main>

          <aside className="h-fit rounded-lg border border-black/10 bg-white p-5 xl:sticky xl:top-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-mono text-[10px] text-black/35">READINESS GATE</p><h3 className="mt-1 text-base font-semibold">进入销售工坊</h3></div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", readiness.status === "go" ? "bg-emerald-100 text-emerald-700" : readiness.status === "conditional_go" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{readiness.status === "go" ? "绿色" : readiness.status === "conditional_go" ? "黄色" : "红色"}</span>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="relative flex size-20 items-center justify-center rounded-full bg-[#f3f4f2]"><span className="font-mono text-xl font-semibold">{readiness.score}</span><span className="absolute bottom-4 text-[9px] text-black/35">/100</span></div>
              <div><p className="text-xs text-black/40">发布模式</p><p className="mt-1 text-sm font-semibold">{readiness.publicationMode === "live" ? "正式发布" : "概念验证"}</p><p className="mt-1 text-[11px] leading-5 text-black/45">{readiness.status === "go" ? "具备进入正式众筹的基础条件。" : readiness.status === "conditional_go" ? "可制作测试页，只能进行非绑定预约。" : "必须返回产品定义或交付准备。"}</p></div>
            </div>
            {readiness.blockers.length > 0 && <div className="mt-5 border-t border-black/10 pt-4"><p className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><AlertTriangle className="size-3.5" />阻塞项</p><ul className="mt-2 grid gap-2">{readiness.blockers.map((item) => <li key={item} className="text-[11px] leading-5 text-black/55">{item}</li>)}</ul></div>}
            {readiness.nextActions.length > 0 && <div className="mt-5 border-t border-black/10 pt-4"><p className="text-xs font-semibold">下一步证据任务</p><ol className="mt-2 grid gap-2">{readiness.nextActions.map((item, index) => <li key={item} className="flex gap-2 text-[11px] leading-5 text-black/55"><span className="font-mono text-black/30">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ol></div>}
            {signalCounts && (
              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-xs font-semibold">验证信号实时</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([
                    ["访问", signalCounts.visit],
                    ["CTA", signalCounts.cta_click],
                    ["留资", signalCounts.email],
                    ["早鸟", signalCounts.earlybird],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-md border border-black/8 bg-[#f7f8f6] px-2.5 py-2">
                      <p className="font-mono text-sm font-semibold tabular-nums">{Number(value ?? 0)}</p>
                      <p className="mt-0.5 text-[10px] text-black/45">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-black/40">
                  发布概念页后，访客访问与预约会累计到这里。
                </p>
                {intentLeads && intentLeads.length > 0 && (
                  <div className="mt-3 border-t border-black/8 pt-3">
                    <p className="text-[11px] font-semibold text-black/55">最近意向（脱敏）</p>
                    <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
                      {intentLeads.slice(0, 10).map((lead) => (
                        <li key={lead.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="min-w-0 truncate font-mono text-black/70">{lead.maskedEmail}</span>
                          <span className="shrink-0 text-black/40">
                            {lead.tierName || (lead.kind === "earlybird" ? "早鸟" : "留资")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 border-t border-black/10 pt-4 text-[11px] leading-5 text-black/45">
              <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />生成概念不能证明性能、量产或认证。</p>
              <p className="mt-1 flex items-center gap-1.5"><Factory className="size-3.5" />黄色状态发布后统一显示“预约但不收费”。</p>
            </div>
          </aside>
        </div>
      </div>

      {published && publicPath && (
        <div className="shrink-0 border-t border-emerald-200 bg-emerald-50/90 px-5 py-3 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Share2 className="size-3.5" />
                概念验证页已可分享
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-emerald-900/70">
                {publicUrl}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-900/55">
                v{published.version} · {published.mode === "live" ? "正式发布" : "概念验证 · 预约不收费"} · {published.summary}
              </p>
              {signalCounts && (
                <p className="mt-1.5 font-mono text-[11px] text-emerald-900/70">
                  访问 {Number(signalCounts.visit ?? 0)}
                  <span className="mx-1.5 text-emerald-900/30">·</span>
                  CTA {Number(signalCounts.cta_click ?? 0)}
                  <span className="mx-1.5 text-emerald-900/30">·</span>
                  留资 {Number(signalCounts.email ?? 0)}
                  <span className="mx-1.5 text-emerald-900/30">·</span>
                  早鸟 {Number(signalCounts.earlybird ?? 0)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-9 border-emerald-300/80 bg-white px-3 text-emerald-900 hover:bg-emerald-50"
                onClick={() => void copyShareLink()}
              >
                <Copy className="size-3.5" />
                {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败" : "复制链接"}
              </Button>
              <Button
                className="h-9 bg-emerald-700 px-3 text-white hover:bg-emerald-800"
                onClick={openPublicPage}
              >
                <ExternalLink className="size-3.5" />
                打开公开页
              </Button>
            </div>
          </div>
        </div>
      )}

      <footer className="shrink-0 border-t border-black/10 bg-white px-5 py-3 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-h-5 max-w-xl text-xs">
            {error ? (
              <span className="flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="size-3.5" />
                {error}
              </span>
            ) : notice ? (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Check className="size-3.5" />
                {notice}
              </span>
            ) : (
              <span className="text-black/40">
                {readiness.status === "blocked"
                  ? "先消除阻塞项，才能批准并发布概念验证页。"
                  : "可先保存草稿；或直接批准定案并发布不收费的概念验证页。"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-9 border-black/15 bg-white px-4 text-[#202622] hover:bg-black/5"
              disabled={busy !== null}
              onClick={() => void save()}
            >
              {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />}
              仅保存
            </Button>
            <Button
              className="h-9 bg-[#1f7f73] px-4 text-white hover:bg-[#17675e]"
              disabled={busy !== null || readiness.status === "blocked"}
              onClick={() => void publishConcept()}
            >
              {busy === "publish" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {published ? "更新并重新发布" : "批准并发布概念页"}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
