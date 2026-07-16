'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowUp, ImageIcon } from 'lucide-react'

export function EditSection() {
  return (
    <section className="px-4 py-28 md:py-40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 md:flex-row md:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="flex flex-1 flex-col items-start gap-6"
        >
          <p className="text-sm text-muted-foreground">点选编辑</p>
          <h2 className="font-serif text-4xl font-semibold leading-snug md:text-5xl">
            懂你所想,
            <br />
            精准编辑
          </h2>
          <p className="leading-relaxed text-muted-foreground text-pretty">
            精准定点修改,只改该改之处。
            <br />
            Lovara 保持设计品质,让每一次编辑都恰到好处。
          </p>
          <Link
            href="/studio"
            className="rounded-lg border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
          >
            体验点选编辑
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="relative w-full md:w-[55%]"
        >
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ImageIcon className="size-3" aria-hidden="true" />
              Image
            </span>
            <span>1440 x 800</span>
          </div>
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src="/images/demo-car.png"
              alt="待编辑的复古赛车创意照片"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
            {/* 标注点 */}
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              className="absolute left-[62%] top-[12%] flex size-7 items-center justify-center rounded-full bg-selection text-xs font-medium text-primary-foreground ring-4 ring-selection/30"
            >
              1
            </motion.span>
          </div>

          {/* 悬浮编辑输入框 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.45 }}
            className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-2xl bg-background/95 px-5 py-4 shadow-2xl backdrop-blur"
          >
            <span className="text-sm">移除</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowUp className="size-4" aria-hidden="true" />
              <span className="sr-only">提交编辑指令</span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
