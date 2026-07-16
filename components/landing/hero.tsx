'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

import { AgenticNode, ShopifyNode } from './hero-commerce-nodes'
import {
  AgentNode,
  CANVAS_H,
  CANVAS_W,
  EDGES,
  NODE_POS,
  RenderNode,
  SPEED,
  SourceNode,
  T,
  TICK,
  edgePath,
} from './hero-workflow'

export function Hero() {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  /* 统一时钟 */
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pausedRef.current) return
      setElapsed((prev) => (prev >= T.loop ? 0 : prev + TICK * SPEED))
    }, TICK)
    return () => window.clearInterval(timer)
  }, [])

  /* 画布随容器宽度等比缩放 */
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / CANVAS_W, 1))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* 顶栏实时状态 */
  const runPhase =
    elapsed < T.agentEnd
      ? '拆解爆款视频'
      : elapsed < T.renders[2].end
        ? '渲染内容资产'
        : elapsed < T.shopEnd
          ? '发布 Shopify'
          : elapsed < T.agenticStart + 6900
            ? 'Agentic 卖货'
            : elapsed < T.agenticEnd
              ? 'Shop Pay 结算'
              : '本轮完成'
  const runClock = `${String(Math.floor(elapsed / 60000)).padStart(2, '0')}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`

  return (
    <section className="overflow-hidden pb-16 pt-28 md:pt-32">
      {/* ── 标题区 ── */}
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground md:text-xs"
        >
          [ TIKTOK 爆款设计 AGENT 工作流 ]
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-[2.75rem] font-semibold leading-[1.12] tracking-tight text-balance md:text-6xl lg:text-[4.5rem]"
        >
          把 TikTok 爆款,
          <br />
          变成你的生意
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          一个 Agent 跑完从拆解爆款视频、复刻内容资产、上架 Shopify,
          到让 ChatGPT 把产品推荐给精准受众的完整工作流。
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-3"
        >
          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            开始孵化爆款
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#flow"
            className="rounded-full border border-border px-6 py-3 text-sm text-foreground/80 transition-colors hover:bg-muted"
          >
            了解工作流
          </Link>
        </motion.div>
      </div>

      {/* ── 节点画布(runtime) ── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mx-auto mt-14 max-w-6xl px-4"
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141412] shadow-2xl shadow-black/30"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* 顶栏:实时运行状态 */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-white/90">Agent 工作流正在运行</span>
              <span className="hidden rounded bg-white/8 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/50 sm:inline">
                run · 便携榨汁杯 #0714 · {runClock}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">{runPhase}</span>
              <span className="hidden text-[10px] text-white/40 sm:inline">{paused ? '已暂停 · 移开继续' : '悬停暂停'}</span>
            </div>
          </div>

          {/* 画布主体:随容器宽度等比缩放 */}
          <div ref={frameRef} className="overflow-hidden" style={{ height: CANVAS_H * scale }}>
            <div className="relative origin-top-left" style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}>
              {/* 点阵背景 */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />

              {/* 连线层:流动 / 静默 / 完成三态 */}
              <svg
                aria-hidden
                className="absolute inset-0"
                width={CANVAS_W}
                height={CANVAS_H}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                fill="none"
              >
                {EDGES.map((e) => {
                  const flowing = elapsed >= e.from && elapsed < e.activeUntil
                  const done = elapsed >= e.activeUntil
                  const d = edgePath(e.x1, e.y1, e.x2, e.y2)
                  return (
                    <g key={e.id}>
                      <path
                        d={d}
                        stroke={flowing ? 'oklch(0.62 0.17 40)' : done ? 'oklch(0.6 0.11 165 / 55%)' : 'rgba(255,255,255,0.1)'}
                        strokeWidth="1.5"
                        strokeDasharray={flowing ? '6 5' : undefined}
                        className={flowing ? 'edge-flowing' : undefined}
                      />
                      {flowing && (
                        <circle r="3" fill="oklch(0.72 0.15 40)">
                          <animateMotion dur="0.9s" repeatCount="indefinite" path={d} />
                        </circle>
                      )}
                      <circle
                        cx={e.x1}
                        cy={e.y1}
                        r="3.5"
                        fill="#141412"
                        stroke={flowing ? 'oklch(0.62 0.17 40)' : done ? 'oklch(0.6 0.11 165)' : 'rgba(255,255,255,0.25)'}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={e.x2}
                        cy={e.y2}
                        r="3.5"
                        fill="#141412"
                        stroke={flowing ? 'oklch(0.62 0.17 40)' : done ? 'oklch(0.6 0.11 165)' : 'rgba(255,255,255,0.25)'}
                        strokeWidth="1.5"
                      />
                    </g>
                  )
                })}
              </svg>

              {/* 节点层 */}
              <div className="absolute" style={{ left: NODE_POS.source.x, top: NODE_POS.source.y }}>
                <SourceNode elapsed={elapsed} />
              </div>
              <div className="absolute" style={{ left: NODE_POS.agent.x, top: NODE_POS.agent.y }}>
                <AgentNode elapsed={elapsed} />
              </div>
              <div className="absolute" style={{ left: NODE_POS.render1.x, top: NODE_POS.render1.y }}>
                <RenderNode elapsed={elapsed} index={0} title="UGC 成片封面" src="/images/ugc-replica.png" prompt="same hook · your product" />
              </div>
              <div className="absolute" style={{ left: NODE_POS.render2.x, top: NODE_POS.render2.y }}>
                <RenderNode elapsed={elapsed} index={1} title="Shopify 商品主图" src="/images/shopify-product-main.png" prompt="studio light · white bg" />
              </div>
              <div className="absolute" style={{ left: NODE_POS.render3.x, top: NODE_POS.render3.y }}>
                <RenderNode elapsed={elapsed} index={2} title="场景详情图" src="/images/shopify-product-lifestyle.png" prompt="kitchen · morning light" />
              </div>
              <div className="absolute" style={{ left: NODE_POS.shopify.x, top: NODE_POS.shopify.y }}>
                <ShopifyNode elapsed={elapsed} />
              </div>
              <div className="absolute" style={{ left: NODE_POS.agentic.x, top: NODE_POS.agentic.y }}>
                <AgenticNode elapsed={elapsed} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes edge-flow {
          to {
            stroke-dashoffset: -11;
          }
        }
        .edge-flowing {
          animation: edge-flow 0.7s linear infinite;
        }
      `}</style>
    </section>
  )
}
