"use client"

import { BrainIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react"
import { CHAT_MODELS, getChatModel, type ChatModelId } from "@/lib/chat-models"
import { useChatModelStore } from "@/lib/chat-model-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function ModelSelector() {
  const modelId = useChatModelStore((state) => state.modelId)
  const setModelId = useChatModelStore((state) => state.setModelId)
  const reasoningEffort = useChatModelStore((state) => state.reasoningEffort)
  const setReasoningEffort = useChatModelStore((state) => state.setReasoningEffort)
  const selected = getChatModel(modelId)
  const supportsReasoning = modelId.startsWith("openai/gpt-5.6-")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" className="h-7 max-w-44 gap-1.5 rounded-full px-2 text-xs font-normal text-muted-foreground" aria-label={`选择模型，当前 ${selected.name}`} />}>
        <BrainIcon size={14} />
        <span className="truncate">{selected.name}</span>
        <CaretDownIcon size={11} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-72 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">选择模型</DropdownMenuLabel>
          {CHAT_MODELS.map((model) => (
            <DropdownMenuItem key={model.id} onClick={() => setModelId(model.id as ChatModelId)} className="items-start gap-2.5 px-2 py-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted"><BrainIcon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium"><span className="truncate">{model.name}</span>{model.id === "mimo/mimo-v2.5-pro" && <span className="rounded-full bg-flame/10 px-1.5 py-0.5 text-[9px] font-medium text-flame">默认</span>}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{model.provider} · {model.description}</span>
              </span>
              {model.id === modelId && <CheckIcon className="mt-1 text-flame" size={14} weight="bold" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {supportsReasoning && <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5">推理强度</DropdownMenuLabel>
            <div className="flex gap-1 px-1 pb-1">
              {(["low", "medium", "high"] as const).map((effort) => <Button key={effort} type="button" variant={reasoningEffort === effort ? "secondary" : "ghost"} size="sm" className="h-7 flex-1 text-xs" onClick={() => setReasoningEffort(effort)}>{({ low: "低", medium: "中", high: "高" })[effort]}</Button>)}
            </div>
          </DropdownMenuGroup>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
