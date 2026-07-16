"use client"

import { create } from "zustand"
import { DEFAULT_CHAT_MODEL, type ChatModelId } from "@/lib/chat-models"

type ChatModelState = {
  modelId: ChatModelId
  reasoningEffort: "low" | "medium" | "high"
  setModelId: (modelId: ChatModelId) => void
  setReasoningEffort: (reasoningEffort: "low" | "medium" | "high") => void
}

export const useChatModelStore = create<ChatModelState>((set) => ({
  modelId: DEFAULT_CHAT_MODEL,
  reasoningEffort: "medium",
  setModelId: (modelId) => set({ modelId }),
  setReasoningEffort: (reasoningEffort) => set({ reasoningEffort }),
}))
