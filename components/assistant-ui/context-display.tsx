"use client"

import { BrainIcon, CirclesThreeIcon, GaugeIcon } from "@phosphor-icons/react"
import { useAuiState } from "@assistant-ui/react"
import { useCanvasStore } from "@/lib/canvas-store"
import { useChatModelStore } from "@/lib/chat-model-store"
import { getChatModel } from "@/lib/chat-models"

export function ContextDisplay() {
  const messages = useAuiState((state) => state.thread.messages.length)
  const running = useAuiState((state) => state.thread.isRunning)
  const objects = useCanvasStore((state) => state.items.length)
  const modelId = useChatModelStore((state) => state.modelId)
  const model = getChatModel(modelId)
  return <div className="flex items-center gap-2 overflow-x-auto px-1 text-[11px] text-muted-foreground" aria-label="当前上下文">
    <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-1"><BrainIcon size={12} />{model.name}</span>
    <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-1"><CirclesThreeIcon size={12} />{objects} 个画布对象</span>
    <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-1"><GaugeIcon size={12} />{messages} 条消息{running ? " · 生成中" : ""}</span>
  </div>
}
