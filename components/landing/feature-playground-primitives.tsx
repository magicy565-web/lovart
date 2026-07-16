'use client'

import { useEffect, useRef, useState } from 'react'

/* 封面就地编辑:点击文字进入编辑态,选框跟随当前元素 */
function CoverEditable({
  value,
  onChange,
  multiline = false,
  textClassName,
  editLabel,
}: {
  value: string
  onChange: (next: string) => void
  multiline?: boolean
  textClassName: string
  editLabel: string
}) {
  const [editing, setEditing] = useState(false)

  const sharedClass = `w-full resize-none border-0 bg-transparent p-0 outline-none ${textClassName}`

  return (
    <span className={`group/edit relative block ${editing ? '' : 'cursor-text'}`}>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                setEditing(false)
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            className={sharedClass}
            aria-label={editLabel}
          />
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                setEditing(false)
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            className={sharedClass}
            aria-label={editLabel}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`block w-full text-left ${textClassName}`}
          aria-label={editLabel}
        >
          {value || 'UNTITLED'}
        </button>
      )}
      {/* 选框:悬停淡显,编辑时常亮并带角点 */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-x-2 -inset-y-1 border transition-opacity duration-200 ${
          editing ? 'border-selection opacity-100' : 'border-selection/70 opacity-0 group-hover/edit:opacity-100'
        }`}
      >
        {[
          '-left-[3px] -top-[3px]',
          '-right-[3px] -top-[3px]',
          '-left-[3px] -bottom-[3px]',
          '-right-[3px] -bottom-[3px]',
        ].map((pos) => (
          <span key={pos} className={`absolute ${pos} size-[5px] bg-selection ${editing ? '' : 'opacity-0'}`} />
        ))}
      </span>
      {/* 悬停提示 */}
      {!editing && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 left-0 rounded bg-selection px-1.5 py-0.5 font-mono text-[9px] text-background opacity-0 transition-opacity duration-200 group-hover/edit:opacity-100"
        >
          {editLabel}
        </span>
      )}
    </span>
  )
}

/* AI 定价建议:基于样本数据为每个挡位生成完整运营模型 */
const PRICING_PLANS = [
  {
    id: 'early',
    label: '早鸟档',
    blurb: 'COMMUTE 01 单包 · 建议限量 120 席',
    price: 449,
    retail: 599,
    confidence: 92,
    /* 单件成本拆解 */
    cost: { production: 148, logistics: 42, platform: 22 },
    /* 广告预测 */
    ads: { cac: 38, budget: 4560, orders: 120, organic: 46 },
    roi: 3.6,
    payback: '预计首周回本',
    insight: '低于零售价 25%,用稀缺席位换首日冲量,点燃算法推荐',
  },
  {
    id: 'standard',
    label: '标准档',
    blurb: 'COMMUTE 01 单包 · 三色任选',
    price: 549,
    retail: 599,
    confidence: 84,
    cost: { production: 148, logistics: 42, platform: 27 },
    ads: { cac: 56, budget: 11200, orders: 200, organic: 38 },
    roi: 2.9,
    payback: '预计 12 天回本',
    insight: '主力出货挡位,守住 60% 毛利的同时保持转化效率',
  },
  {
    id: 'bundle',
    label: '通勤套装',
    blurb: '双肩包 + 收纳内胆 + 雨罩',
    price: 849,
    retail: 1099,
    confidence: 78,
    cost: { production: 236, logistics: 58, platform: 42 },
    ads: { cac: 74, budget: 5920, orders: 80, organic: 31 },
    roi: 2.4,
    payback: '预计 18 天回本',
    insight: '用配件组合拉高客单价,套装省 ¥250 提升凑单意愿',
  },
] as const

/* 成本条分段配色:白底平面风的扁平色块 */
const COST_SEGMENTS = [
  { key: 'production', label: '生产', className: 'bg-neutral-800' },
  { key: 'logistics', label: '物流', className: 'bg-neutral-400' },
  { key: 'platform', label: '平台费', className: 'bg-neutral-200' },
] as const

/* 数字滚动:目标值变化时用 rAF 缓动过渡 */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let raf: number
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}

/* 置信度环形仪表:白底平面风,粗弧线无发光 */
function ConfidenceRing({ confidence }: { confidence: number }) {
  const animated = useCountUp(confidence)
  const R = 25
  const CIRC = 2 * Math.PI * R

  return (
    <div className="relative size-[76px]" role="img" aria-label={`模型置信度 ${confidence}%`}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" className="stroke-neutral-100" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - animated / 100)}
          className="stroke-[#05ce78]"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-neutral-900">
        {Math.round(animated)}%
      </span>
    </div>
  )
}

export {
  CoverEditable,
  PRICING_PLANS,
  COST_SEGMENTS,
  useCountUp,
  ConfidenceRing,
}

