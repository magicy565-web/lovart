'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { ImageIcon } from 'lucide-react'

const FRAMES = [
  { src: '/images/demo-hiker.png', alt: '徒步人物风格帧', selected: false },
  { src: '/images/demo-mountain.png', alt: '雪山场景分镜', selected: true },
  { src: '/images/demo-eyewear.png', alt: '眼镜产品渲染图', selected: false },
  { src: '/images/demo-poster.png', alt: '眼镜品牌海报设计', selected: false },
]

export function CanvasSection() {
  return (
    <section className="px-4 py-28 md:py-40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-sm text-muted-foreground"
        >
          自主智能
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.08 }}
          className="font-serif text-4xl font-semibold md:text-6xl"
        >
          以系统思维设计
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.16 }}
          className="leading-relaxed text-muted-foreground text-pretty"
        >
          设计决策,并非一座孤岛。
          <br />
          Lovara 将色彩、版式、语言统一为完整的品牌体系,
          <br />
          从第一稿,到第一百稿。
        </motion.p>
      </div>

      <div className="mx-auto mt-20 flex max-w-6xl flex-wrap justify-center gap-6 md:flex-nowrap">
        {FRAMES.map((frame, i) => (
          <motion.figure
            key={frame.src}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.12, duration: 0.55 }}
            className="w-[calc(50%-12px)] md:w-1/4"
          >
            <figcaption className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ImageIcon className="size-3" aria-hidden="true" />
                Image
              </span>
              <span>720 x 960</span>
            </figcaption>
            <div
              className={`relative aspect-[3/4] overflow-hidden ${
                frame.selected ? 'ring-1 ring-selection' : ''
              }`}
            >
              <Image
                src={frame.src || "/placeholder.svg"}
                alt={frame.alt}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {frame.selected && (
                <>
                  <span className="absolute -left-0.5 -top-0.5 size-1.5 bg-selection" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 size-1.5 bg-selection" aria-hidden="true" />
                  <span className="absolute -bottom-0.5 -left-0.5 size-1.5 bg-selection" aria-hidden="true" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-1.5 bg-selection" aria-hidden="true" />
                </>
              )}
            </div>
          </motion.figure>
        ))}
      </div>
    </section>
  )
}
