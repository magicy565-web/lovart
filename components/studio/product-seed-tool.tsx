"use client"

import { useEffect } from "react"
import { makeAssistantToolUI, useAui, useAuiState } from "@assistant-ui/react"
import { ArrowRightIcon, CaretRightIcon, CircleNotchIcon, CompassIcon } from "@phosphor-icons/react"
import { useDirectionStore } from "@/lib/studio/direction-store"
import { useProcessStore } from "@/lib/studio/process-store"
import type { ProductSeedData } from "@/lib/studio/process-types"

function ProductSeedView({ result, toolCallId }: { result?: ProductSeedData; toolCallId: string }) {
  const aui = useAui()
  const isRunning = useAuiState((state) => state.thread.isRunning)
  const setProductSeed = useProcessStore((state) => state.setProductSeed)
  useEffect(() => { if (result) setProductSeed(`product-seed-${toolCallId}`, result) }, [result, setProductSeed, toolCallId])

  if (!result) return <div className="my-2.5 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"><CircleNotchIcon className="size-4 animate-spin" /><span className="text-xs text-muted-foreground">正在整理内部产品摘要…</span></div>
  const seed = result

  function chooseDirection(direction: ProductSeedData["directions"][number]) {
    const thread = aui.thread()
    if (thread.getState().isRunning) return
    const expectedText = `我选择「${direction.title}」方向：${direction.description}。请先验证这个方向的真实市场证据。`
    useDirectionStore.getState().setPending({
      parentId: `product-seed-${toolCallId}`,
      product: seed.product,
      user: seed.user,
      scenario: seed.scenario,
      ...direction,
      expectedText,
    })
    thread.append({
      content: [{ type: "text", text: expectedText }],
      runConfig: thread.composer().getState().runConfig,
    })
  }

  return (
    <details open className="group my-2.5 overflow-hidden rounded-xl border border-border/60 bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 marker:content-none">
        <CompassIcon className="size-4 text-flame" weight="fill" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">内部摘要 · {result.product}</span>
        <span className="text-[10px] text-muted-foreground">产品种子</span>
        <CaretRightIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border/50 px-3 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{result.problem}</p>
        <div className="mt-3 grid gap-2">
          {result.directions.map((direction, index) => (
            <button key={direction.title} type="button" disabled={isRunning} onClick={() => chooseDirection(direction)} className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left transition-colors hover:border-flame/40 disabled:cursor-wait disabled:opacity-50">
              <span className="font-mono text-[10px] text-flame">0{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{direction.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{direction.description}</span></span><ArrowRightIcon className="size-3.5" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">选择方向后将立即验证真实市场证据。</p>
      </div>
    </details>
  )
}

export const ProductSeedToolUI = makeAssistantToolUI<ProductSeedData, ProductSeedData>({ toolName: "createProductSeed", render: ({ result, toolCallId }) => <ProductSeedView result={result} toolCallId={toolCallId} /> })
