'use client'

import Image from 'next/image'
import { motion, useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe, LayoutGrid, ScanText } from 'lucide-react'
import { LogoMark } from './logo-mark'

const STEPS = [
  { icon: ScanText, label: '已分析用户意图' },
  { icon: Globe, label: '已探索视觉趋势' },
  { icon: LayoutGrid, label: '已收集参考资料' },
]

export function WorkspaceDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const timer = setInterval(() => {
      setStep((s) => (s >= 6 ? s : s + 1))
    }, 700)
    return () => clearInterval(timer)
  }, [inView])

  return (
    <section className="px-4 pt-20 md:px-10">
      <div
        ref={ref}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[oklch(0.75_0.05_240)] p-4 md:p-8"
      >
        {/* 水彩纹理背景 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 20% 30%, oklch(0.85 0.04 230), transparent), radial-gradient(ellipse 50% 60% at 80% 70%, oklch(0.65 0.06 250), transparent)',
          }}
        />

        <div className="relative flex flex-col gap-3 md:h-[560px] md:flex-row">
          {/* 画布区 */}
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-background/95">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <LogoMark className="size-5" />
              <span className="text-sm">徒步品牌宣传视频</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="relative flex-1 p-8 min-h-[320px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={step >= 4 ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="relative w-36 md:w-44"
              >
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Image</span>
                  <span>720 x 960</span>
                </div>
                <div className="relative aspect-[3/4] overflow-hidden ring-1 ring-selection">
                  <Image
                    src="/images/demo-hiker.png"
                    alt="AI 生成的户外徒步品牌人物形象"
                    fill
                    className="object-cover"
                    sizes="176px"
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={step >= 5 ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="absolute left-52 top-24 hidden w-44 md:block lg:left-64"
              >
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Image</span>
                  <span>720 x 960</span>
                </div>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src="/images/demo-mountain.png"
                    alt="AI 生成的雪山徒步分镜画面"
                    fill
                    className="object-cover"
                    sizes="176px"
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* 对话区 */}
          <div className="flex w-full flex-col rounded-2xl bg-background/95 p-4 md:w-72 lg:w-80">
            <p className="mb-4 text-sm">新对话</p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
              className="self-end rounded-xl bg-secondary px-3.5 py-3 text-xs leading-relaxed text-secondary-foreground"
            >
              为户外徒步品牌宣传视频头脑风暴分镜概念和风格帧,聚焦风景、人物比例和户外情感。
            </motion.div>

            <div className="mt-5 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={step >= i + 2 ? { opacity: 1, x: 0 } : {}}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <s.icon className="size-3.5" aria-hidden="true" />
                  {s.label}
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={step >= 5 ? { opacity: 1 } : {}}
              transition={{ duration: 0.8 }}
              className="mt-5 text-xs leading-relaxed text-muted-foreground"
            >
              我已为户外徒步品牌宣传视频生成了创意素材,场景设定在高山雪原环境,强调耐用性和抗寒性能。素材包含以自然为主导的分镜和电影感风格帧。
            </motion.p>

            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-border px-3.5 py-3 text-xs text-muted-foreground">
                你想设计什么?
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
