'use client'

import Image from 'next/image'
import {
  CheckCircle2,
  Clapperboard,
  ImageIcon,
  Loader2,
  Play,
  Sparkles,
} from 'lucide-react'

/**
 * Hero 画布 = 真实 runtime 的节点式工作流。
 * 整个画布由一个统一时钟(elapsed ms)驱动,每个节点根据时间轴
 * 推进自己的内部子状态:流式日志、打字机、进度条、多步骤执行。
 */

/* ── 运行时时间轴(ms) ── */
const T = {
  agentStart: 700,
  agentEnd: 5600,
  renders: [
    { start: 5600, end: 8400 },
    { start: 8400, end: 11200 },
    { start: 11200, end: 14000 },
  ],
  shopStart: 14000,
  shopEnd: 20600,
  agenticStart: 20600,
  agenticEnd: 32600,
  loop: 35400,
} as const

const TICK = 120
/* 播放倍速:每个真实 TICK 推进 SPEED 倍的时间轴 */
const SPEED = 2

/* ── 画布与节点坐标 ── */
const CANVAS_W = 1120
const CANVAS_H = 648

const NODE_POS = {
  source: { x: 24, y: 190 },
  agent: { x: 250, y: 200 },
  render1: { x: 512, y: 18 },
  render2: { x: 512, y: 228 },
  render3: { x: 512, y: 438 },
  shopify: { x: 790, y: 96 },
  agentic: { x: 800, y: 396 },
} as const

/* 连线:from 起始流动时间 / activeUntil 到达后停止流动 */
const EDGES = [
  { id: 'e-source-agent', x1: 206, y1: 322, x2: 250, y2: 322, from: 200, activeUntil: T.agentEnd },
  { id: 'e-agent-r1', x1: 476, y1: 322, x2: 512, y2: 120, from: T.agentEnd - 500, activeUntil: T.renders[0].end },
  { id: 'e-agent-r2', x1: 476, y1: 322, x2: 512, y2: 330, from: T.renders[0].end - 500, activeUntil: T.renders[1].end },
  { id: 'e-agent-r3', x1: 476, y1: 322, x2: 512, y2: 540, from: T.renders[1].end - 500, activeUntil: T.renders[2].end },
  { id: 'e-r1-shop', x1: 676, y1: 120, x2: 790, y2: 180, from: T.renders[2].end - 500, activeUntil: T.shopEnd },
  { id: 'e-r2-shop', x1: 676, y1: 330, x2: 790, y2: 210, from: T.renders[2].end - 500, activeUntil: T.shopEnd },
  { id: 'e-r3-agentic', x1: 676, y1: 540, x2: 800, y2: 500, from: T.shopEnd - 500, activeUntil: T.agenticEnd },
  { id: 'e-shop-agentic', x1: 1010, y1: 300, x2: 950, y2: 396, from: T.shopEnd - 500, activeUntil: T.agenticEnd },
] as const

function edgePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(Math.abs(x2 - x1) * 0.5, 36)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

/* ── 工具:按时间流式截取文本(打字机) / 进度 ── */
function typed(text: string, elapsed: number, start: number, cps = 26) {
  if (elapsed < start) return ''
  return text.slice(0, Math.floor(((elapsed - start) / 1000) * cps))
}

function pct(elapsed: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (elapsed - start) / (end - start)))
}

type NodeStatus = 'idle' | 'running' | 'done'

/* ── 节点外壳:状态 = 生命力 ── */
function NodeShell({
  title,
  icon: Icon,
  status,
  statusText,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  status: NodeStatus
  statusText?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border bg-[#1c1c1a] shadow-xl shadow-black/40 transition-all duration-500 ${
        status === 'running'
          ? 'border-primary/70 shadow-[0_0_32px_-8px] shadow-primary/30'
          : status === 'done'
            ? 'border-emerald-500/50'
            : 'border-white/10 opacity-55'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/90">
          <Icon className="size-3 text-white/50" />
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          {statusText && (
            <span className={`font-mono text-[9px] tabular-nums ${status === 'running' ? 'text-primary' : 'text-white/40'}`}>{statusText}</span>
          )}
          {status === 'done' ? (
            <CheckCircle2 className="size-3 text-emerald-400" />
          ) : status === 'running' ? (
            <Loader2 className="size-3 animate-spin text-primary" />
          ) : (
            <span className="size-2 rounded-full bg-white/15" />
          )}
        </span>
      </div>
      {children}
    </div>
  )
}

/* ── 1. 爆款原片:视频播放中(播放头行进 + 采集扫描) ── */
function SourceNode({ elapsed }: { elapsed: number }) {
  const playing = elapsed < T.agentEnd
  const progress = (elapsed % 3700) / 3700
  return (
    <NodeShell
      title="爆款原片"
      icon={Clapperboard}
      status={playing ? 'running' : 'done'}
      statusText={playing ? `采集 00:${(progress * 37).toFixed(0).padStart(2, '0')}` : '已采集'}
    >
      <div className="relative m-2 aspect-[3/4] w-41 overflow-hidden rounded-lg">
        <video
          src="/videos/swiftblend-demo-1.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-label="TikTok 爆款原片:榨汁杯 UGC 视频"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-1.5 top-1.5 rounded-sm bg-rose-500 px-1 py-0.5 text-[8px] font-medium text-white">TikTok</span>
        <span className="absolute bottom-2.5 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] text-white">
          <Play className="size-2 fill-white" />
          2140 万播放
        </span>
        {/* 采集扫描线 */}
        {playing && (
          <div
            aria-hidden
            className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-primary/30 to-transparent transition-[top] duration-150 ease-linear"
            style={{ top: `${(progress * 128) % 108 - 8}%` }}
          />
        )}
        {/* 播放进度条 */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
          <div className="h-full bg-rose-400 transition-[width] duration-150 ease-linear" style={{ width: `${playing ? progress * 100 : 100}%` }} />
        </div>
      </div>
    </NodeShell>
  )
}

/* ── 2. 拆解 Agent:时间轴扫描 + 流式日志 + 输出打字 ── */
const AGENT_LOGS = [
  { at: T.agentStart + 150, text: '> 载入视频 00:00 – 00:37' },
  { at: T.agentStart + 850, text: '> 扫描分镜 · 识别 6 个镜头' },
  { at: T.agentStart + 1650, text: '✓ 开场钩子 0-3s:产品怼脸 + 惊叹' },
  { at: T.agentStart + 2500, text: '✓ 口播节奏:痛点 → 演示 → 价格钩子' },
  { at: T.agentStart + 3350, text: '✓ 产品特写 ×3:出杯 / 清洗 / 便携' },
] as const

function AgentNode({ elapsed }: { elapsed: number }) {
  const status: NodeStatus = elapsed < T.agentStart ? 'idle' : elapsed < T.agentEnd ? 'running' : 'done'
  const scanPct = pct(elapsed, T.agentStart, T.agentStart + 3400)
  const sec = (scanPct * 37).toFixed(1).padStart(4, '0')
  const outputText = typed('output → 3 × image prompt · 已派发渲染', elapsed, T.agentStart + 3900, 24)
  return (
    <NodeShell
      title="拆解 Agent"
      icon={Sparkles}
      status={status}
      statusText={status === 'running' ? `分析中 00:${sec}` : status === 'done' ? '5 项洞察' : '等待输入'}
    >
      <div className="w-56 p-2.5">
        {/* 视频时间轴扫描 */}
        <div className="mb-2 flex items-center gap-1.5">
          <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-white/6">
            {[14, 30, 47, 63, 80].map((left) => (
              <span key={left} className="absolute top-0 h-full w-px bg-white/12" style={{ left: `${left}%` }} />
            ))}
            <div className="absolute inset-y-0 left-0 bg-primary/20 transition-[width] duration-150 ease-linear" style={{ width: `${scanPct * 100}%` }} />
            {status === 'running' && scanPct < 1 && (
              <span
                className="absolute top-0 h-full w-[2px] bg-primary shadow-[0_0_8px] shadow-primary transition-[left] duration-150 ease-linear"
                style={{ left: `${scanPct * 100}%` }}
              />
            )}
          </div>
          <span className="font-mono text-[8.5px] tabular-nums text-white/40">00:{sec}</span>
        </div>

        {/* 流式分析日志 */}
        <div className="flex min-h-[96px] flex-col gap-1.5 font-mono text-[9.5px] leading-relaxed">
          {status === 'idle' ? (
            <p className="text-white/25">等待视频输入…</p>
          ) : (
            AGENT_LOGS.map((log) => {
              const line = typed(log.text, elapsed, log.at, 42)
              if (!line) return null
              const isInsight = log.text.startsWith('✓')
              const isTyping = line.length < log.text.length
              return (
                <p key={log.at} className={isInsight ? 'text-emerald-400/90' : 'text-white/45'}>
                  {line}
                  {isTyping && <span className="animate-pulse text-primary">▌</span>}
                </p>
              )
            })
          )}
        </div>

        {/* 输出端 */}
        <div className="mt-1 border-t border-white/8 pt-1.5 font-mono text-[9px] text-primary">
          {outputText || <span className="text-white/25">output …</span>}
          {outputText.length > 0 && status === 'running' && <span className="animate-pulse">▌</span>}
        </div>
      </div>
    </NodeShell>
  )
}

/* ── 3. 图像渲染:噪点 → 显影 + step 计数 ── */
function RenderNode({
  elapsed,
  index,
  title,
  src,
  prompt,
}: {
  elapsed: number
  index: 0 | 1 | 2
  title: string
  src: string
  prompt: string
}) {
  const { start, end } = T.renders[index]
  const status: NodeStatus = elapsed < start ? 'idle' : elapsed < end ? 'running' : 'done'
  const p = pct(elapsed, start, end)
  const steps = Math.floor(p * 28)
  return (
    <NodeShell
      title={title}
      icon={ImageIcon}
      status={status}
      statusText={status === 'running' ? `step ${steps}/28` : status === 'done' ? '28 steps' : '排队中'}
    >
      <div className="w-41 p-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-[#141412]">
          {status === 'idle' ? (
            <div className="flex h-full items-center justify-center font-mono text-[8px] text-white/25">等待 prompt…</div>
          ) : (
            <>
              <Image
                src={src || "/placeholder.svg"}
                alt={title}
                width={160}
                height={160}
                className="h-full w-full object-cover transition-all duration-200"
                style={{
                  opacity: status === 'done' ? 1 : 0.3 + p * 0.7,
                  filter: status === 'done' ? 'none' : `blur(${(1 - p) * 16}px) saturate(${0.4 + p * 0.6})`,
                  transform: status === 'done' ? 'scale(1)' : 'scale(1.05)',
                }}
              />
              {/* 噪点层 */}
              {status === 'running' && (
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    opacity: (1 - p) * 0.8,
                    backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.08) 0% 25%, transparent 0% 50%)',
                    backgroundSize: '5px 5px',
                  }}
                />
              )}
              {/* 扫描线 */}
              {status === 'running' && (
                <div
                  aria-hidden
                  className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-sky-300/30 to-transparent transition-[top] duration-150 ease-linear"
                  style={{ top: `${p * 100}%` }}
                />
              )}
              {status === 'running' && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                  {Math.floor(p * 100)}%
                </span>
              )}
              {/* 进度条 */}
              {status === 'running' && (
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/50">
                  <div className="h-full bg-sky-400 transition-[width] duration-150 ease-linear" style={{ width: `${p * 100}%` }} />
                </div>
              )}
            </>
          )}
        </div>
        <p className="mt-1.5 truncate font-mono text-[8.5px] tracking-tight text-white/40">{status === 'idle' ? '—' : prompt}</p>
      </div>
    </NodeShell>
  )
}

export {
  T,
  TICK,
  SPEED,
  CANVAS_W,
  CANVAS_H,
  NODE_POS,
  EDGES,
  edgePath,
  typed,
  pct,
  NodeShell,
  SourceNode,
  AgentNode,
  RenderNode,
}
export type { NodeStatus }

