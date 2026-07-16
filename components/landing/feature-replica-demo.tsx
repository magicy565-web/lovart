'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Check, MousePointer2, WandSparkles } from 'lucide-react'

/* ────────────────────────────────────────────
   演示时间轴(毫秒):三段式编辑演示
   1. 框选 Logo 区 + 提示词逐字输入
   2. 框选包身 + 颜色选择器
   3. 图 B 渲染加载
──────────────────────────────────────────── */
const T = {
  /* 1a. 光标进入并拉出第一个选框 */
  drag1Start: 1400,
  drag1End: 2800,
  /* 1b. 提示词输入 */
  promptShow: 3100,
  typeStart: 3400,
  typeEnd: 7400,
  tag1: 7800,
  /* 2a. 第二个选框 */
  drag2Start: 8400,
  drag2End: 9700,
  /* 2b. 取色器 */
  pickerShow: 10000,
  sweepStart: 10300,
  sweepEnd: 12300,
  colorPicked: 12600,
  /* 3. 渲染 */
  generateClick: 13700,
  renderStart: 14000,
  renderEnd: 18200,
  done: 18400,
  loop: 21800,
} as const

const TICK = 100

const PROMPT_TEXT = '替换为「NORTHLOOP」反光字标,加入等高线织标元素'

/* 选框坐标(画布百分比) */
const BOX1 = { x: 36, y: 48, w: 26, h: 20 }
const BOX2 = { x: 22, y: 12, w: 54, h: 32 }

/* 色板:森林绿是目标色 */
const SWATCHES = ['#C2552B', '#8C5A3B', '#2F4A3C', '#44614F', '#5B6470', '#B9A38A', '#22303C', '#0F766E']
const TARGET_SWATCH = 2

/* 光标路径关键帧 */
const CURSOR_PATH = [
  { t: 0, x: 90, y: 94 },
  { t: T.drag1Start, x: BOX1.x, y: BOX1.y },
  { t: T.drag1End, x: BOX1.x + BOX1.w, y: BOX1.y + BOX1.h },
  { t: T.tag1, x: BOX1.x + BOX1.w, y: BOX1.y + BOX1.h },
  { t: T.drag2Start, x: BOX2.x, y: BOX2.y },
  { t: T.drag2End, x: BOX2.x + BOX2.w, y: BOX2.y + BOX2.h },
  { t: T.sweepStart, x: 80, y: 26 },
  { t: T.sweepEnd, x: 88, y: 34 },
  { t: T.colorPicked, x: 84, y: 30 },
  { t: T.generateClick, x: 87, y: 90 },
  { t: T.loop, x: 87, y: 90 },
]

function typed(text: string, elapsed: number, start: number, cps = 12) {
  if (elapsed < start) return ''
  return text.slice(0, Math.floor(((elapsed - start) / 1000) * cps))
}

function pct(elapsed: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (elapsed - start) / (end - start)))
}

function cursorAt(elapsed: number) {
  for (let i = 0; i < CURSOR_PATH.length - 1; i++) {
    const a = CURSOR_PATH[i]
    const b = CURSOR_PATH[i + 1]
    if (elapsed >= a.t && elapsed <= b.t) {
      const k = b.t === a.t ? 0 : (elapsed - a.t) / (b.t - a.t)
      /* easeInOut */
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }
    }
  }
  const last = CURSOR_PATH[CURSOR_PATH.length - 1]
  return { x: last.x, y: last.y }
}

/* 拖拽中的选框尺寸 */
function dragBox(box: typeof BOX1, elapsed: number, start: number, end: number) {
  const k = pct(elapsed, start, end)
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
  return { x: box.x, y: box.y, w: box.w * e, h: box.h * e }
}

/* 噪点纹理(SVG feTurbulence) */
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E\")"

/* ── 三段式编辑演示画布 ── */
function ReplicaDemo() {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return
      setElapsed((prev) => (prev >= T.loop ? 0 : prev + TICK))
    }, TICK)
    return () => clearInterval(id)
  }, [])

  const t = elapsed

  const cursor = cursorAt(t)
  const box1 = t >= T.drag1End ? BOX1 : dragBox(BOX1, t, T.drag1Start, T.drag1End)
  const box2 = t >= T.drag2End ? BOX2 : dragBox(BOX2, t, T.drag2Start, T.drag2End)
  const showBox1 = t >= T.drag1Start && t < T.renderStart
  const showBox2 = t >= T.drag2Start && t < T.renderStart
  const promptText = typed(PROMPT_TEXT, t, T.typeStart)
  const showPrompt = t >= T.promptShow && t < T.tag1
  const tag1Done = t >= T.tag1
  const showPicker = t >= T.pickerShow && t < T.generateClick
  const colorDone = t >= T.colorPicked
  /* 色板扫过:高亮索引随时间推进,最终停在目标色 */
  const sweepIndex = t < T.sweepStart ? -1 : t >= T.colorPicked ? TARGET_SWATCH : Math.min(SWATCHES.length - 1, Math.floor(((t - T.sweepStart) / (T.sweepEnd - T.sweepStart)) * SWATCHES.length))
  const showGenerate = t >= T.colorPicked && t < T.renderStart
  const generatePressed = t >= T.generateClick && t < T.renderStart
  const rendering = t >= T.renderStart && t < T.renderEnd
  const renderPct = pct(t, T.renderStart, T.renderEnd)
  const isDone = t >= T.done
  const showImageB = t >= T.renderStart
  const stepLabel = t < T.drag1Start ? '待机 · 爆款参考' : t < T.drag2Start ? '01 框选 · 提示词' : t < T.generateClick ? '02 框选 · 颜色选择' : t < T.done ? '03 渲染生成' : '完成 · 你的品牌'

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="img"
      aria-label="演示:在爆款背包图上框选区域、输入提示词和选择颜色,生成 NORTHLOOP 品牌成品"
    >
      {/* 图 A:爆款参考原图 */}
      <Image src="/images/northloop-reference.png" alt="" fill className="object-cover" sizes="60vw" />

      {/* 图 B:渲染显影(噪点 → 模糊 → 清晰) */}
      {showImageB && (
        <div className="absolute inset-0">
          <Image
            src="/images/northloop-forest.png"
            alt=""
            fill
            className="object-cover"
            sizes="60vw"
            style={{ opacity: isDone ? 1 : renderPct, filter: isDone ? 'none' : `blur(${(1 - renderPct) * 16}px)` }}
          />
          {rendering && (
            <>
              <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: NOISE_BG, opacity: (1 - renderPct) * 0.55 }} />
              {/* 扫描线 */}
              <div className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-emerald-300/25 to-transparent" style={{ top: `${renderPct * 100}%` }} />
              {/* 进度指示 */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-background/85 px-3 py-2 backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="font-mono text-[11px] tabular-nums text-foreground">rendering · step {Math.max(1, Math.round(renderPct * 28))}/28 · {Math.round(renderPct * 100)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 阶段标签 */}
      <div className="absolute left-4 top-4 rounded-md bg-background/85 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground backdrop-blur">{stepLabel}</div>
      {/* 角标 */}
      <div className="absolute right-4 top-4 rounded-md bg-background/85 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">{isDone ? 'NORTHLOOP · 你的品牌' : '爆款参考 · 来自 TikTok'}</div>

      {/* 选框一:Logo 区 + 提示词 */}
      {showBox1 && (
        <div className="absolute" style={{ left: `${box1.x}%`, top: `${box1.y}%`, width: `${box1.w}%`, height: `${box1.h}%` }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(52,211,153,0.06)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6 4" className="animate-march" />
          </svg>
          {[['-left-1','-top-1'],['-right-1','-top-1'],['-left-1','-bottom-1'],['-right-1','-bottom-1']].map(([x,y]) => <span key={`${x}${y}`} className={`absolute ${x} ${y} size-2 rounded-[2px] bg-emerald-400`} />)}
          {/* 提示词输入框 */}
          {showPrompt && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-2 left-0 w-72 max-w-[70vw] translate-y-full rounded-lg border border-emerald-400/50 bg-background/95 p-2.5 shadow-xl backdrop-blur">
              <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-emerald-400"><WandSparkles className="size-2.5" />PROMPT · 选区编辑</p>
              <p className="mt-1.5 min-h-8 text-xs leading-relaxed text-foreground">{promptText}{t < T.typeEnd && <span className="animate-pulse text-emerald-400">▌</span>}</p>
            </motion.div>
          )}
          {/* 已确认标签 */}
          {tag1Done && !rendering && !isDone && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-2 left-0 flex -translate-y-full items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-medium text-white">
              <Check className="size-2.5" />字标 · NORTHLOOP
            </motion.span>
          )}
        </div>
      )}

      {/* 选框二:包身 + 颜色 */}
      {showBox2 && (
        <div className="absolute" style={{ left: `${box2.x}%`, top: `${box2.y}%`, width: `${box2.w}%`, height: `${box2.h}%` }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <rect x="0" y="0" width="100%" height="100%" fill={colorDone ? 'rgba(47,74,60,0.15)' : 'rgba(52,211,153,0.05)'} stroke={colorDone ? '#2F4A3C' : '#34d399'} strokeWidth="1.5" strokeDasharray="6 4" className="animate-march" />
          </svg>
          {[['-left-1','-top-1'],['-right-1','-top-1'],['-left-1','-bottom-1'],['-right-1','-bottom-1']].map(([x,y]) => <span key={`${x}${y}`} className={`absolute ${x} ${y} size-2 rounded-[2px] ${colorDone ? 'bg-[#2F4A3C]' : 'bg-emerald-400'}`} />)}
          {colorDone && !rendering && !isDone && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-2 left-0 flex -translate-y-full items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur">
              <span className="size-2.5 rounded-full" style={{ background: '#2F4A3C' }} />主体色 · #2F4A3C<Check className="size-2.5 text-emerald-400" />
            </motion.span>
          )}
        </div>
      )}

      {/* 颜色选择器面板 */}
      {showPicker && (
        <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="absolute right-4 top-[22%] w-44 rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
          <p className="font-mono text-[9px] tracking-wide text-muted-foreground">COLOR · 选区填充</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {SWATCHES.map((color, index) => (
              <span key={color} className={`relative aspect-square rounded-md transition-transform duration-150 ${index === sweepIndex ? 'scale-110 ring-2 ring-foreground/70' : ''}`} style={{ background: color }}>
                {colorDone && index === TARGET_SWATCH && <Check className="absolute inset-0 m-auto size-3.5 text-white" />}
              </span>
            ))}
          </div>
          <p className="mt-2.5 font-mono text-[10px] tabular-nums text-foreground">{colorDone ? '#2F4A3C · Forest' : sweepIndex >= 0 ? SWATCHES[sweepIndex] : '——'}</p>
        </motion.div>
      )}

      {/* 生成按钮 */}
      {showGenerate && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, scale: generatePressed ? 0.94 : 1 }}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-lg"
          tabIndex={-1}
          aria-hidden="true"
        >
          <WandSparkles className="size-3" />生成品牌成品
        </motion.button>
      )}

      {/* 完成徽章 */}
      {isDone && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-background/90 px-3.5 py-2 backdrop-blur">
          <span className="flex items-center gap-1 text-[11px] font-medium text-foreground"><Check className="size-3 text-emerald-400" />字标已替换</span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1 text-[11px] font-medium text-foreground"><span className="size-2.5 rounded-full" style={{ background: '#2F4A3C' }} />森林绿</span>
        </motion.div>
      )}

      {/* 模拟光标 */}
      {!isDone && (
        <MousePointer2 className="absolute z-10 size-5 fill-background text-foreground drop-shadow-md transition-none" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} aria-hidden="true" />
      )}
    </div>
  )
}

/* 样本分析演示视频:图标聚合 → 交叉分析 → 生成销售卡片 */
function SampleAnalysisVideo({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (active) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [active])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <video
        ref={videoRef}
        src="/videos/sample-analysis.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        className="block w-full"
        aria-label="演示:Agent 从 Amazon 与 TikTok 样本库抓取数据,交叉分析后生成评分最高的销售卡片"
      />
    </div>
  )
}

export { ReplicaDemo, SampleAnalysisVideo }

