import { create } from "zustand"
import type { ProductDirection } from "@/lib/studio/process-types"

type PendingDirection = ProductDirection & {
  parentId: string
  product: string
  user: string
  scenario: string
  expectedText: string
}

type DirectionState = {
  pending: PendingDirection | null
  setPending: (pending: PendingDirection) => void
  consumeIfMatched: (messages: unknown[]) => PendingDirection | null
}

function messageText(messages: unknown[]) {
  const list = messages as Array<{ role?: string; parts?: Array<{ type?: string; text?: string }>; content?: string }>
  const latest = [...list].reverse().find((message) => message.role === "user") ?? list.at(-1)
  if (typeof latest?.content === "string") return latest.content
  return latest?.parts?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("") ?? ""
}

export const useDirectionStore = create<DirectionState>((set, get) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  consumeIfMatched: (messages) => {
    const pending = get().pending
    const text = messageText(messages).trim()
    if (!pending || (!text.includes(`我选择「${pending.title}」方向`) && text !== pending.expectedText.trim())) return null
    set({ pending: null })
    return pending
  },
}))
