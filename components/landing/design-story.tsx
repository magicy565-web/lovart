'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Play, Sparkles } from 'lucide-react'

type Asset = {
  label: string
  caption: string
  src: string
  kind?: 'video'
}

type ProductCase = {
  no: string
  category: string
  name: string
  en: string
  thesis: string
  signal: string
  result: string
  accent: string
  assets: Asset[]
}

const CASES: ProductCase[] = [
  {
    no: '01', category: '厨房电器', name: 'SwiftBlend 随行榨汁杯', en: 'Portable blender, reimagined.',
    thesis: '把 2,140 万播放的内容信号，扩展成一个可以立即上架的商品世界。', signal: 'TikTok 原片 2,140 万播放', result: '12 项资产 · 48h 上架', accent: '爆款复刻',
    assets: [
      { label: 'UGC 成片', caption: '阳台晨间使用场景', src: '/videos/swiftblend-demo-1.mp4', kind: 'video' },
      { label: '商品主图', caption: 'Sage Green / 380ml', src: '/images/shopify-product-main.png' },
      { label: '生活方式', caption: '晨光厨房场景', src: '/images/shopify-product-lifestyle.png' },
      { label: '投放视觉', caption: '鲜果配方平铺', src: '/images/case-flatlay.png' },
    ],
  },
  {
    no: '02', category: '美容护肤', name: 'Citrus C 焕亮精华', en: 'The morning ritual.',
    thesis: '不从成分表出发，而从清晨第一束照进浴室的光开始讲述产品。', signal: '“7 天焕亮”趋势 +182%', result: '落地页转化率 4.8%', accent: '内容新消费',
    assets: [
      { label: '品牌主视觉', caption: 'Blood orange / Vitamin C', src: '/images/case-serum-main.png' },
      { label: '创作者内容', caption: 'Morning routine UGC', src: '/images/case-serum-ugc.png' },
      { label: '包装方向', caption: '暖橙色识别系统', src: '/images/case-serum-packaging.png' },
    ],
  },
  {
    no: '03', category: '宠物生活', name: 'Milo 智能饮水机', en: 'Hydration, made instinctive.',
    thesis: '先捕捉猫咪第一次靠近的真实反应，再解释三重过滤的产品逻辑。', signal: '宠物饮水焦虑讨论 +76%', result: '投放 CPA 降低 36%', accent: '情绪价值',
    assets: [
      { label: '商品视觉', caption: 'Sage / 自动循环水流', src: '/images/case-pet-main.png' },
      { label: '使用场景', caption: '真实宠物反应素材', src: '/images/case-pet-ugc.png' },
      { label: '颜色延展', caption: 'Sage / Ivory / Clay', src: '/images/case-pet-colorway.png' },
    ],
  },
  {
    no: '04', category: '旅行收纳', name: 'Fold Air 压缩收纳包', en: 'Pack less. Go further.',
    thesis: '“一拉压缩 50%”是三秒就能看懂、也最适合被传播的购买理由。', signal: '登机箱收纳挑战持续爆发', result: '首周售出 1,842 套', accent: '功能可视化',
    assets: [
      { label: '系列主图', caption: 'Sand / 3-piece set', src: '/images/case-travel-main.png' },
      { label: '功能演示', caption: '压缩前后对比场景', src: '/images/case-travel-ugc.png' },
      { label: '轻旅延展', caption: '酒店与登机箱内容方向', src: '/images/case-travel-outdoor.png' },
    ],
  },
  {
    no: '05', category: '氛围家居', name: 'Mori 无线蘑菇灯', en: 'A small light for slower nights.',
    thesis: '参数退到幕后，让氛围成为产品最先被理解、也最想被收藏的功能。', signal: 'Pinterest 收藏意图 2.7X', result: '4 种情绪场景一键生成', accent: '氛围设计',
    assets: [
      { label: '氛围主图', caption: 'Ivory / warm dimming', src: '/images/case-lamp-main.png' },
      { label: '触控演示', caption: '床头灯光切换场景', src: '/images/case-lamp-ugc.png' },
      { label: '空间搭配', caption: '胡桃木与夜间阅读场景', src: '/images/case-lamp-interior.png' },
    ],
  },
  {
    no: '06', category: '户外咖啡', name: 'Piccolo 便携浓缩机', en: 'Espresso, anywhere.',
    thesis: '无需寻找咖啡馆，把一段意大利清晨随身带进露营和通勤。', signal: '户外咖啡搜索 +91%', result: '一天完成 3 套市场定位', accent: '场景再定义',
    assets: [
      { label: '产品大片', caption: 'Travertine / morning sun', src: '/images/case-coffee-main.png' },
      { label: '包装提案', caption: '纸浆内托与开箱方向', src: '/images/case-coffee-packaging.png' },
    ],
  },
  {
    no: '07', category: '运动穿戴', name: 'Form 可调节负重环', en: 'Weight, with intention.',
    thesis: '像首饰一样被渴望，像训练器械一样真正有效。', signal: '低冲击塑形内容 +143%', result: '创意点击率提升 68%', accent: '品类升级',
    assets: [
      { label: '产品大片', caption: 'Terracotta / sculptural', src: '/images/case-fitness-main.png' },
      { label: '训练场景', caption: '低冲击 Pilates 动作演示', src: '/images/case-fitness-lifestyle.png' },
    ],
  },
  {
    no: '08', category: '桌面科技', name: 'Dock One 磁吸充电座', en: 'One place for everything.',
    thesis: '从凌乱到秩序，是桌面产品三秒内就能讲清楚的购买理由。', signal: '桌面重置视频播放破亿', result: '组合客单价提升 31%', accent: '秩序美学',
    assets: [
      { label: '桌面主视觉', caption: 'Aluminum / dark walnut', src: '/images/case-desk-main.png' },
      { label: '材质细节', caption: '铝合金倒角与织物线缆', src: '/images/case-dock-detail.png' },
    ],
  },
  {
    no: '09', category: '城市户外', name: 'Roam 防水斜挎包', en: 'Made for uncertain weather.',
    thesis: '穿过城市，也准备好随时离开城市。', signal: '轻户外通勤成为新品类', result: '首批预售达成 126%', accent: '跨场景设计',
    assets: [
      { label: '户外主视觉', caption: 'Rust / alpine lake', src: '/images/case-outdoor-bag.png' },
      { label: '城市通勤', caption: '雨后街头穿搭场景', src: '/images/case-bag-city.png' },
    ],
  },
]

function HoverVideo({ asset, active }: { asset: Asset; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  return (
    <div
      className="group relative h-full w-full overflow-hidden"
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0 } }}
    >
      <video ref={ref} src={asset.src} muted loop playsInline preload="metadata" aria-label={asset.caption} className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/10 transition-opacity group-hover:opacity-0">
        <span className="flex size-14 items-center justify-center rounded-full bg-paper text-ink shadow-xl"><Play className="ml-0.5 size-4 fill-current" /></span>
      </div>
      {active && <span className="absolute right-4 top-4 rounded-full bg-ink/70 px-3 py-1 font-mono text-[9px] tracking-wider text-paper">悬停播放</span>}
    </div>
  )
}

export function DesignStory() {
  const [caseIndex, setCaseIndex] = useState(0)
  const [assetIndex, setAssetIndex] = useState(0)
  const item = CASES[caseIndex]
  const asset = item.assets[Math.min(assetIndex, item.assets.length - 1)]

  const chooseCase = (index: number) => { setCaseIndex(index); setAssetIndex(0) }

  return (
    <section id="flow" className="bg-ink py-24 text-paper md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* 保留原来的标题结构，仅加入刊物细节 */}
        <header className="border-b border-paper/15 pb-12">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-paper/45 uppercase">
            <span className="flex items-center gap-2"><Sparkles className="size-3" /> 从灵感到上架</span>
            <span>Product cases / Vol. 01</span>
          </div>
          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-4xl font-serif text-5xl font-semibold leading-[0.98] tracking-tight text-balance md:text-7xl">产品灵感设计案例</h2>
            <p className="max-w-md text-sm leading-relaxed text-paper/55 md:text-base">浏览不同品类的完整内容资产。保持原有案例浏览方式，加入更像设计刊物的版式、编号与编辑注释。</p>
          </div>
        </header>

        {/* 原结构：左侧目录 / 中间主视觉 / 右侧案例信息 */}
        <div className="grid border-b border-paper/15 lg:grid-cols-[190px_minmax(0,1fr)_300px]">
          <nav aria-label="产品案例目录" className="border-paper/15 py-8 lg:border-r lg:pr-6">
            <p className="mb-5 font-mono text-[9px] tracking-[0.18em] text-paper/35 uppercase">Contents — 09 cases</p>
            <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-1">
              {CASES.map((entry, index) => (
                <button
                  key={entry.no}
                  type="button"
                  onClick={() => chooseCase(index)}
                  className={`group flex items-baseline gap-3 border-t py-3 text-left transition-colors ${index === caseIndex ? 'border-flame text-paper' : 'border-paper/10 text-paper/40 hover:text-paper/75'}`}
                  aria-pressed={index === caseIndex}
                >
                  <span className={`font-mono text-[9px] ${index === caseIndex ? 'text-flame' : 'text-paper/25'}`}>{entry.no}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{entry.name.replace(/ .*/, '')}</span>
                    <span className="mt-0.5 block text-[9px] text-current opacity-60">{entry.category}</span>
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 py-8 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div key={`${item.no}-${assetIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} className="relative aspect-[4/3] overflow-hidden bg-paper/5">
                {asset.kind === 'video' ? <HoverVideo asset={asset} active /> : <Image src={asset.src} alt={`${item.name}：${asset.caption}`} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover transition-transform duration-700 hover:scale-[1.015]" />}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/70 to-transparent px-5 pb-4 pt-20">
                  <div><p className="font-mono text-[9px] tracking-[0.15em] text-paper/60 uppercase">Asset {String(assetIndex + 1).padStart(2, '0')}</p><p className="mt-1 text-sm font-medium">{asset.caption}</p></div>
                  <span className="font-serif text-5xl text-paper/75">{item.no}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {item.assets.map((entry, index) => (
                <button key={entry.src} type="button" onClick={() => setAssetIndex(index)} className={`group text-left ${index === assetIndex ? 'text-paper' : 'text-paper/40'}`} aria-label={`查看${entry.label}`} aria-pressed={index === assetIndex}>
                  <span className={`relative block aspect-[4/3] overflow-hidden border border-paper/15 ${index === assetIndex ? 'ring-2 ring-inset ring-flame' : 'transition-opacity group-hover:border-paper/35'}`}>
                    {entry.kind === 'video' ? <video src={entry.src} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <Image src={entry.src} alt="" fill sizes="160px" className="object-cover opacity-80 transition-opacity group-hover:opacity-100" />}
                  </span>
                  <span className="mt-2 block font-mono text-[8px] tracking-wider uppercase">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="border-paper/15 py-8 lg:border-l lg:pl-8">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.16em] text-flame uppercase"><span>{item.category}</span><span>Case {item.no}</span></div>
            <p className="mt-10 font-serif text-lg italic text-paper/45">{item.en}</p>
            <h3 className="mt-2 font-serif text-4xl font-semibold leading-tight text-balance">{item.name}</h3>
            <p className="mt-7 font-serif text-xl leading-relaxed text-paper/85 text-pretty">{item.thesis}</p>
            <dl className="mt-9 border-y border-paper/15 py-5">
              <div className="flex justify-between gap-5"><dt className="font-mono text-[9px] tracking-wider text-paper/35 uppercase">Signal</dt><dd className="text-right text-xs text-paper/70">{item.signal}</dd></div>
              <div className="mt-4 flex justify-between gap-5"><dt className="font-mono text-[9px] tracking-wider text-paper/35 uppercase">Result</dt><dd className="text-right text-xs text-paper/70">{item.result}</dd></div>
            </dl>
            <div className="mt-8 flex items-center justify-between border-t border-paper/15 pt-4"><span className="rounded-full border border-flame/50 px-3 py-1 text-[10px] text-flame">{item.accent}</span><ArrowUpRight className="size-4 text-paper/45" /></div>
          </aside>
        </div>

        <footer className="flex flex-col gap-4 pt-8 font-mono text-[9px] tracking-[0.14em] text-paper/35 uppercase sm:flex-row sm:items-center sm:justify-between"><span>09 products / {CASES.reduce((total, entry) => total + entry.assets.length, 0)} generated assets</span><span>QIWU Product Journal — 2026</span></footer>
      </div>
    </section>
  )
}
