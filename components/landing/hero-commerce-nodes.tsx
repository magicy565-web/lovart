'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import {
  CheckCircle2,
  Lock,
  Loader2,
  ShoppingBag,
  Star,
  Store,
  Zap,
} from 'lucide-react'

import { NodeShell, T, pct, typed, type NodeStatus } from './hero-workflow'

/* ── 4. 发布 Shopify:多步骤 runtime ── */
const SHOP_STEPS = [
  { at: T.shopStart, dur: 1500, label: '上传 3 张素材图' },
  { at: T.shopStart + 1500, dur: 1700, label: '生成商品详情文案' },
  { at: T.shopStart + 3200, dur: 900, label: '定价 $29.99 · 库存 500' },
  { at: T.shopStart + 4100, dur: 1200, label: '发布到 juicyclub.com' },
  { at: T.shopStart + 5300, dur: 900, label: '同步 TikTok Shop 橱窗' },
] as const

function ShopifyNode({ elapsed }: { elapsed: number }) {
  const status: NodeStatus = elapsed < T.shopStart ? 'idle' : elapsed < T.shopEnd ? 'running' : 'done'
  const published = elapsed >= T.shopStart + 5300 + 900
  const copyText = typed('30 秒鲜榨 · USB-C 快充 · 一键清洗,办公室工位神器', elapsed, T.shopStart + 1600, 28)
  const doneCount = SHOP_STEPS.filter((s) => elapsed >= s.at + s.dur).length
  return (
    <NodeShell
      title="发布 · Shopify"
      icon={Store}
      status={status}
      statusText={status === 'running' ? `${doneCount}/5 步` : status === 'done' ? '已上架' : '等待资产'}
    >
      <div className="w-72 p-2.5">
        {!published ? (
          /* 发布过程:步骤逐一执行 */
          <div className="flex min-h-[188px] flex-col gap-1.5">
            {SHOP_STEPS.map((step) => {
              const stepStatus: NodeStatus = elapsed < step.at ? 'idle' : elapsed < step.at + step.dur ? 'running' : 'done'
              const sp = pct(elapsed, step.at, step.at + step.dur)
              return (
                <div
                  key={step.label}
                  className={`rounded-md px-2 py-1.5 text-[10px] leading-snug transition-colors duration-300 ${
                    stepStatus === 'running'
                      ? 'bg-primary/10 text-white/90'
                      : stepStatus === 'done'
                        ? 'bg-white/4 text-white/55'
                        : 'bg-white/4 text-white/25'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {stepStatus === 'done' ? (
                      <CheckCircle2 className="size-2.5 shrink-0 text-emerald-400" />
                    ) : stepStatus === 'running' ? (
                      <Loader2 className="size-2.5 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="size-2.5 shrink-0 rounded-full border border-white/20" />
                    )}
                    {step.label}
                    {stepStatus === 'running' && (
                      <span className="ml-auto font-mono text-[8px] text-primary">{Math.floor(sp * 100)}%</span>
                    )}
                  </div>
                  {/* 传图:三张缩略图依次上传 */}
                  {step.label.startsWith('上传') && stepStatus === 'running' && (
                    <div className="mt-1.5 flex gap-1.5 pl-4">
                      {['/images/ugc-replica.png', '/images/shopify-product-main.png', '/images/shopify-product-lifestyle.png'].map(
                        (img, i) => {
                          const imgP = Math.max(0, Math.min(1, sp * 3 - i))
                          return (
                            <div key={img} className="relative size-8 overflow-hidden rounded-sm bg-white/5">
                              <Image
                                src={img || "/placeholder.svg"}
                                alt=""
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                                style={{ opacity: 0.25 + imgP * 0.75 }}
                              />
                              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/50">
                                <div className="h-full bg-emerald-400" style={{ width: `${imgP * 100}%` }} />
                              </div>
                            </div>
                          )
                        },
                      )}
                    </div>
                  )}
                  {/* 文案:打字机 */}
                  {step.label.startsWith('生成') && stepStatus !== 'idle' && copyText && (
                    <p className="mt-1 pl-4 font-mono text-[8.5px] leading-relaxed text-white/45">
                      {copyText}
                      {stepStatus === 'running' && <span className="animate-pulse text-primary">▌</span>}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* 发布完成:商品页上线 */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[188px]">
            <div className="overflow-hidden rounded-lg bg-white">
              <div className="flex items-center gap-1 border-b border-black/8 bg-[#f6f6f4] px-2 py-1">
                <span className="flex gap-0.5">
                  <span className="size-1.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-1.5 rounded-full bg-[#febc2e]" />
                  <span className="size-1.5 rounded-full bg-[#28c840]" />
                </span>
                <span className="flex-1 truncate rounded bg-white px-1.5 py-px text-[7px] text-neutral-500">
                  juicyclub.com/products/portable-juicer
                </span>
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-0.5 whitespace-nowrap rounded-full bg-emerald-100 px-1 py-px text-[6.5px] font-medium text-emerald-700"
                >
                  <CheckCircle2 className="size-1.5" />
                  已上架
                </motion.span>
              </div>
              <div className="flex gap-2 p-2">
                <div className="w-16 shrink-0 overflow-hidden rounded bg-[#f7f7f5]">
                  <Image
                    src="/images/shopify-product-main.png"
                    alt="Shopify 商品主图"
                    width={128}
                    height={128}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col text-neutral-900">
                  <p className="text-[6.5px] uppercase tracking-wider text-neutral-400">Juicy Club</p>
                  <p className="text-[10px] font-semibold leading-tight">Portable Juicer Blender Cup</p>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-1.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-[6.5px] text-neutral-400">128</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10.5px] font-bold">
                      $29.99 <span className="text-[7px] font-normal text-neutral-400 line-through">$39.99</span>
                    </span>
                    <span className="rounded-sm bg-[#5a31f4] px-1.5 py-0.5 text-[6.5px] font-semibold text-white">Shop Pay</span>
                  </div>
                </div>
              </div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-2 text-center font-mono text-[8px] text-white/40"
            >
              TikTok Shop 橱窗已同步 · 发布链接已生成
            </motion.p>
          </motion.div>
        )}
      </div>
    </NodeShell>
  )
}

/* ── 5. AI 卖货:ChatGPT 对话推荐 → Shop Pay 结算 → 支付成功 ── */
function AgenticNode({ elapsed }: { elapsed: number }) {
  const s = T.agenticStart
  const status: NodeStatus = elapsed < s ? 'idle' : elapsed < T.agenticEnd ? 'running' : 'done'
  const userText = typed('推荐一个工位就能用的榨汁杯,预算 $30', elapsed, s + 300, 15)
  const userDone = elapsed >= s + 2800
  const thinking = userDone && elapsed < s + 3700
  const replyText = typed('对比了 12 款便携榨汁杯,这款最适合办公室:380ml 随行杯身、USB-C 快充、30 秒出杯。', elapsed, s + 3700, 22)
  const cardVisible = elapsed >= s + 5300
  const bought = elapsed >= s + 6300
  /* 结算子阶段:跳转 checkout → Shop Pay 处理 → 支付成功 */
  const checkoutVisible = elapsed >= s + 6900
  const payStart = s + 8300
  const paid = elapsed >= s + 10300
  const payProcessing = elapsed >= payStart && !paid
  const payPct = Math.round(pct(elapsed, payStart, s + 10300) * 100)
  const statusText =
    status === 'idle'
      ? '等待商品目录'
      : status === 'done'
        ? '已成交 · 已支付'
        : paid
          ? '订单已支付'
          : payProcessing
            ? 'Shop Pay 处理中'
            : checkoutVisible
              ? '结算中 · juicyclub.com'
              : thinking
                ? 'ChatGPT 思考中'
                : '对话进行中'
  return (
    <NodeShell title="AI 卖货 · Agentic" icon={Zap} status={status} statusText={statusText}>
      <div className="flex min-h-[158px] w-72 flex-col gap-1.5 p-2.5">
        {status === 'idle' ? (
          <div className="flex flex-1 items-center justify-center font-mono text-[8.5px] text-white/25">
            商品目录接入后,AI 购物助手开始推荐…
          </div>
        ) : !checkoutVisible ? (
          <>
            {/* 用户消息(逐字) */}
            {userText && (
              <div className="max-w-[85%] self-end rounded-xl rounded-br-sm bg-white/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-white/90">
                {userText}
                {!userDone && <span className="animate-pulse text-primary">▌</span>}
              </div>
            )}
            {/* 思考中 */}
            {thinking && (
              <div className="flex items-center gap-1 self-start rounded-xl rounded-bl-sm bg-white/6 px-2.5 py-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1 animate-bounce rounded-full bg-white/50"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
            {/* 流式回复 */}
            {replyText && (
              <div className="max-w-[92%] self-start rounded-xl rounded-bl-sm bg-white/6 px-2.5 py-1.5 text-[10px] leading-relaxed text-white/75">
                {replyText}
                {elapsed < s + 5300 && <span className="animate-pulse text-primary">▌</span>}
              </div>
            )}
            {/* 商品推荐卡 */}
            {cardVisible && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-teal-400/30 bg-teal-500/5 p-1.5"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-sm bg-white">
                  <Image src="/images/shopify-product-main.png" alt="AI 推荐商品" width={72} height={72} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[10px] font-semibold text-white">Portable Juicer Cup</p>
                    <span className="whitespace-nowrap rounded-sm bg-teal-500/20 px-1 py-px text-[6.5px] text-teal-300">你的商品</span>
                  </div>
                  <p className="text-[7.5px] text-white/45">juicyclub.com · $29.99</p>
                </div>
                {bought ? (
                  <span className="rounded-md bg-[#5a31f4] px-2 py-1 text-[8px] font-semibold text-white">Shop Pay</span>
                ) : (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.9 }}
                    className="rounded-md bg-white px-2 py-1 text-[8px] font-semibold text-neutral-900"
                  >
                    Buy
                  </motion.span>
                )}
              </motion.div>
            )}
            {/* 跳转结算提示 */}
            {bought && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 self-center font-mono text-[7.5px] text-white/40"
              >
                <span className="size-1 animate-pulse rounded-full bg-[#8f6fff]" />
                正在连接 juicyclub.com 结算…
              </motion.div>
            )}
          </>
        ) : (
          /* ── Shopify Checkout(Shop Pay)── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-lg bg-white"
          >
            {/* checkout 地址栏 */}
            <div className="flex items-center gap-1.5 border-b border-black/8 bg-[#f6f6f4] px-2 py-1">
              <Lock className="size-2 text-emerald-600" />
              <span className="flex-1 truncate font-mono text-[7px] text-neutral-500">
                juicyclub.com/checkouts/cn/a1b2c3
              </span>
              <span className="rounded-sm bg-[#5a31f4] px-1 py-px text-[6px] font-bold text-white">shop&nbsp;Pay</span>
            </div>
            {/* 订单行 */}
            <div className="flex items-center gap-1.5 px-2 pt-1.5">
              <div className="relative size-7 shrink-0 overflow-hidden rounded-sm border border-black/10">
                <Image src="/images/shopify-product-main.png" alt="" width={56} height={56} className="h-full w-full object-cover" />
                <span className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-neutral-700 text-[5.5px] text-white">1</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-semibold text-neutral-900">Portable Juicer Cup</p>
                <p className="text-[6.5px] text-neutral-400">Sage Green / 380ml</p>
              </div>
              <span className="text-[8px] font-semibold text-neutral-900">$29.99</span>
            </div>
            {/* 金额小计 */}
            <div className="px-2 pt-1 text-[6.5px] text-neutral-500">
              <div className="flex justify-between"><span>Shipping</span><span className="text-emerald-600">Free</span></div>
              <div className="flex justify-between border-t border-black/6 pt-0.5 text-[7.5px] font-semibold text-neutral-900">
                <span>Total</span><span>$29.99 USD</span>
              </div>
            </div>
            {/* 支付按钮 / 处理中 / 成功 */}
            <div className="p-2">
              {paid ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-500/12 py-1.5 text-[8px] font-semibold text-emerald-600"
                >
                  <CheckCircle2 className="size-2.5" />
                  支付成功 · 订单 #1027 已确认
                </motion.div>
              ) : payProcessing ? (
                <div className="relative overflow-hidden rounded-md bg-[#5a31f4] py-1.5">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-300"
                    style={{ width: `${payPct}%` }}
                  />
                  <p className="relative text-center text-[8px] font-semibold text-white">
                    Shop Pay 支付处理中 · {payPct}%
                  </p>
                </div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8 }}
                  className="rounded-md bg-[#5a31f4] py-1.5 text-center text-[8px] font-semibold text-white"
                >
                  Pay with Shop&nbsp;Pay
                </motion.div>
              )}
              <p className="mt-1 text-center text-[6px] text-neutral-400">
                {paid ? '收据已发送 · TikTok Shop 订单同步' : '已使用 Shop Pay 保存的收货与支付信息'}
              </p>
            </div>
          </motion.div>
        )}
        {/* 成交回执 */}
        {paid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 self-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[8px] text-emerald-400"
          >
            <ShoppingBag className="size-2.5" />
            对话发起 · 店铺结算 · GMV +$29.99
          </motion.div>
        )}
      </div>
    </NodeShell>
  )
}

export { ShopifyNode, AgenticNode }
