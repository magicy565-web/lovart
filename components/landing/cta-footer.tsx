'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { LogoMark } from './logo-mark'

export function CtaSection() {
  return (
    <section className="px-4 pb-16" id="pricing">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-card px-6 py-28 text-center md:py-36">
        {/* 等高线背景 */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
          viewBox="0 0 1200 500"
          preserveAspectRatio="xMidYMid slice"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M${-100 + i * 160},520 C ${i * 140},${300 - i * 18} ${400 + i * 90},${140 + i * 30} ${340 + i * 130},-40`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>

        <div className="relative flex flex-col items-center gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            className="font-serif text-4xl font-semibold md:text-6xl"
          >
            准备好发布你的产品了吗?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            从一句灵感,到第一笔真实订单
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/register"
              className="inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
            >
              免费开始
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const FOOTER_LINKS = [
  {
    title: '公司',
    links: ['定价', '博客', '更新日志', '文档', '新闻', '使用条款', '隐私政策'],
  },
  {
    title: '社交媒体',
    links: ['X', 'YouTube', 'LinkedIn', 'Instagram', 'TikTok'],
  },
]

export function Footer() {
  return (
    <footer className="px-6 pb-10 pt-16 md:px-16" id="news">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex items-center gap-2 self-start">
            <LogoMark className="size-8" />
            <span className="text-xl font-bold tracking-tight">启物</span>
          </div>

          <div className="flex gap-20 md:gap-28">
            {FOOTER_LINKS.map((col) => (
              <nav key={col.title} aria-label={col.title} className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">{col.title}</p>
                {col.links.map((link) => (
                  <Link
                    key={link}
                    href="#"
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {'© 2026 版权所有,启物'}
        </p>
      </div>
    </footer>
  )
}
