'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { MousePointer2, Rocket, Scan, TrendingUp, Type, WandSparkles } from 'lucide-react'

import { ReplicaDemo, SampleAnalysisVideo } from './feature-replica-demo'
import {
  COST_SEGMENTS,
  ConfidenceRing,
  CoverEditable,
  PRICING_PLANS,
  useCountUp,
} from './feature-playground-primitives'

export function FeaturePlayground() {
  const [headline, setHeadline] = useState('NORTHLOOP COMMUTE 01')
  const [subline, setSubline] = useState('从 TikTok 爆款到自有品牌,一条工作流完成。')

  const [scanActive, setScanActive] = useState(false)

  /* AI 定价卡:当前查看的挡位 */
  const [planIndex, setPlanIndex] = useState(0)
  const plan = PRICING_PLANS[planIndex]

  /* 单件经济模型:成本合计 → 毛利 → 毛利率 */
  const costTotal = plan.cost.production + plan.cost.logistics + plan.cost.platform
  const unitMargin = plan.price - costTotal
  const marginRate = Math.round((unitMargin / plan.price) * 100)
  const discount = Math.round((1 - plan.price / plan.retail) * 100)
  const adRevenue = plan.ads.orders * plan.price

  /* 滚动数字:切换挡位时核心指标缓动过渡 */
  const animatedPrice = useCountUp(plan.price)
  const animatedCac = useCountUp(plan.ads.cac)
  const animatedBudget = useCountUp(plan.ads.budget)
  const animatedRoi = useCountUp(plan.roi)

  return (
    <section id="features" className="px-4 py-28 md:py-40">
      <div className="mx-auto flex max-w-7xl flex-col gap-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center"><span className="text-sm text-muted-foreground">复刻任意一款 TikTok 爆款</span><h2 className="font-serif text-5xl font-semibold md:text-7xl">极速复刻</h2><p className="max-w-xl leading-relaxed text-muted-foreground">框选任意区域,改字号、换颜色,一次生成属于你自己品牌的成品。从别人的爆款,到你的生意。</p></div>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div className="flex flex-col gap-5"><span className="flex size-10 items-center justify-center rounded-full border border-border"><MousePointer2 className="size-4" /></span><h3 className="font-serif text-4xl">框选 · 提示词 · 生成</h3><p className="max-w-md leading-relaxed text-muted-foreground">在爆款原图上框选 Logo 区,一句提示词替换成「NORTHLOOP」反光字标;再框选包身,从取色器选中森林绿——点击生成,渲染出你的品牌成品。</p><p className="font-mono text-[11px] tracking-wide text-muted-foreground">鼠标悬停画布可暂停演示</p></div>
          <ReplicaDemo />
        </div>

        <motion.div
          className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]"
          onViewportEnter={() => setScanActive(true)}
          onViewportLeave={() => setScanActive(false)}
          viewport={{ amount: 0.35 }}
        >
          <div className="order-2 lg:order-1">
            <SampleAnalysisVideo active={scanActive} />
          </div>
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <span className="flex size-10 items-center justify-center rounded-full border border-border"><Scan className="size-4" /></span>
            <h3 className="font-serif text-4xl">真实数据,选出最优样例</h3>
            <p className="leading-relaxed text-muted-foreground">不靠猜。Agent 从 Amazon 与 TikTok 的多产品样本库中抓取评分、评价与增长趋势,交叉分析后给出评分最高的设计方向——你的每一次复刻,都建立在真实市场数据之上。</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] tabular-nums text-muted-foreground">
              <span>1,284 个样本</span>
              <span className="text-border">/</span>
              <span>2 个平台</span>
              <span className="text-border">/</span>
              <span>30 天数据窗口</span>
            </div>
            <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className={`size-1.5 rounded-full bg-emerald-400 ${scanActive ? 'animate-pulse' : ''}`} />
              交叉分析评分与增长趋势,生成销售卡片
            </p>
          </div>
        </motion.div>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div className="flex flex-col gap-5"><span className="flex size-10 items-center justify-center rounded-full border border-border"><Type className="size-4" /></span><h3 className="font-serif text-4xl">众筹页,实时可编辑</h3><p className="max-w-md leading-relaxed text-muted-foreground">生成的不只是图片。产品名、卖点与排版都能直接修改,发布前的每个字都由你掌控。</p><p className="font-mono text-[11px] tracking-wide text-muted-foreground">点击封面上的标题或副标题,直接修改文字</p></div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-card">
            <Image src="/images/northloop-collection.png" alt="NORTHLOOP COMMUTE 01 可编辑众筹页封面" fill className="object-cover" sizes="60vw" />
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-background/80 via-transparent to-background/40 p-7 md:p-10">
              <div className="flex justify-between text-xs"><span>LAUNCH CAMPAIGN</span><span>DAY 01</span></div>
              <div className="flex max-w-xl flex-col gap-3">
                <h4 className="sr-only">{headline || 'UNTITLED'}</h4>
                <CoverEditable
                  value={headline}
                  onChange={setHeadline}
                  multiline
                  textClassName="font-serif text-4xl leading-none md:text-6xl"
                  editLabel="编辑产品名称"
                />
                <CoverEditable
                  value={subline}
                  onChange={setSubline}
                  textClassName="text-xs leading-relaxed"
                  editLabel="编辑卖点文案"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="order-2 lg:order-1">
            {/* AI 定价建议运营卡:白底平面 MG 风格 */}
            <div className="overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl">
              {/* 卡片头:扁平标识 + 胶囊挡位切换 */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 md:px-8 md:pt-8">
                <p className="flex items-center gap-2 text-xs font-bold tracking-wide">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#05ce78]">
                    <WandSparkles className="size-3.5 text-white" />
                  </span>
                  AI 定价引擎
                </p>
                <div className="flex rounded-full bg-neutral-100 p-1" role="tablist" aria-label="选择定价挡位">
                  {PRICING_PLANS.map((item, index) => (
                    <button
                      key={item.id}
                      role="tab"
                      aria-selected={planIndex === index}
                      onClick={() => setPlanIndex(index)}
                      className={`relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        planIndex === index ? 'text-white' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {planIndex === index && (
                        <motion.span
                          layoutId="plan-tab"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className="absolute inset-0 rounded-full bg-neutral-900"
                        />
                      )}
                      <span className="relative">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-7 p-6 md:p-8">
                {/* 推荐价格:滚动数字 + 平面环形置信度 */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">推荐众筹价 · {plan.blurb}</p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <p className="text-5xl font-bold tabular-nums tracking-tight md:text-6xl">
                        ¥{Math.round(animatedPrice)}
                      </p>
                      <span className="text-sm tabular-nums text-neutral-400 line-through">¥{plan.retail}</span>
                      <span className="rounded-full bg-[#05ce78] px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
                        -{discount}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceRing confidence={plan.confidence} />
                    <div className="text-[11px] font-medium leading-relaxed text-neutral-500">
                      <p>模型</p>
                      <p>置信度</p>
                    </div>
                  </div>
                </div>

                {/* 利润率:扁平分段色块条 */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-bold">单件利润结构</p>
                    <p className="text-xs font-bold tabular-nums">
                      毛利 ¥{unitMargin} · <span className="text-[#028858]">{marginRate}%</span>
                    </p>
                  </div>
                  <div className="flex h-4 w-full gap-1 overflow-hidden" role="img" aria-label={`成本结构:生产 ¥${plan.cost.production},物流 ¥${plan.cost.logistics},平台费 ¥${plan.cost.platform},毛利 ¥${unitMargin}`}>
                    {COST_SEGMENTS.map((segment) => (
                      <motion.span
                        key={segment.key}
                        animate={{ width: `${(plan.cost[segment.key] / plan.price) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                        className={`rounded-md ${segment.className}`}
                      />
                    ))}
                    <motion.span
                      animate={{ width: `${(unitMargin / plan.price) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                      className="rounded-md bg-[#05ce78]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] tabular-nums text-neutral-500">
                    {COST_SEGMENTS.map((segment) => (
                      <span key={segment.key} className="flex items-center gap-1.5">
                        <span className={`size-2.5 rounded-full ${segment.className}`} />
                        {segment.label} ¥{plan.cost[segment.key]}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#05ce78]" />
                      毛利 ¥{unitMargin}
                    </span>
                  </div>
                </div>

                {/* 广告预测 + ROI:三块扁平灰底指标 */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-xl bg-neutral-100 p-4">
                    <p className="text-[11px] font-medium text-neutral-500">获客成本 CAC</p>
                    <p className="text-2xl font-bold tabular-nums">¥{Math.round(animatedCac)}</p>
                    <p className="text-[11px] leading-snug text-neutral-500">自然流量占比 {plan.ads.organic}%</p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl bg-neutral-100 p-4">
                    <p className="text-[11px] font-medium text-neutral-500">建议广告预算</p>
                    <p className="text-2xl font-bold tabular-nums">¥{Math.round(animatedBudget).toLocaleString('zh-CN')}</p>
                    <p className="text-[11px] leading-snug text-neutral-500">预估 {plan.ads.orders} 单 · ¥{adRevenue.toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl bg-[#05ce78] p-4 text-white">
                    <p className="flex items-center gap-1 text-[11px] font-medium text-white/85">
                      ROI 预测
                      <TrendingUp className="size-3" />
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{animatedRoi.toFixed(1)}x</p>
                    <p className="text-[11px] leading-snug text-white/85">{plan.payback}</p>
                  </div>
                </div>

                {/* AI 结论:扁平浅绿信息块 */}
                <div className="rounded-xl bg-[#05ce78]/10 px-4 py-3.5" aria-live="polite">
                  <p className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-700">
                    <WandSparkles className="mt-0.5 size-3.5 shrink-0 text-[#028858]" />
                    <motion.span key={`${plan.id}-insight`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                      {plan.insight}
                    </motion.span>
                  </p>
                </div>
              </div>

              {/* 卡片脚:数据来源 */}
              <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-3.5 text-[11px] tabular-nums text-neutral-400 md:px-8">
                <span>基于 1,284 个样本 · 30 天数据窗口</span>
                <span className="flex items-center gap-1.5 font-medium text-[#028858]">
                  <span className="size-1.5 rounded-full bg-[#05ce78]" />
                  模型已就绪
                </span>
              </div>
            </div>
          </div>
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <span className="flex size-10 items-center justify-center rounded-full border border-border"><Rocket className="size-4" /></span>
            <h3 className="font-serif text-4xl">定价,交给数据</h3>
            <p className="leading-relaxed text-muted-foreground">发布 Kickstarter 之前,AI 已经替你算清账:推荐众筹价、单件利润结构、广告预算与 ROI 预测——每个挡位一张运营卡,开模投产之前就知道这门生意划不划算。</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] tabular-nums text-muted-foreground">
              <span>3 个定价挡位</span>
              <span className="text-border">/</span>
              <span>4 项核心指标</span>
              <span className="text-border">/</span>
              <span>置信度 78-92%</span>
            </div>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">切换卡片顶部的挡位,查看每档的运营模型</p>
          </div>
        </div>
      </div>
    </section>
  )
}

