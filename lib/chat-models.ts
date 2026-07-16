export const CHAT_MODELS = [
  { id: "mimo/mimo-v2.5-pro", name: "MiMo 2.5 Pro", provider: "MiMo", description: "默认 · 产品企划与工具调用" },
  { id: "openai/gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "OpenAI", description: "快速响应与日常协作" },
  { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "OpenAI", description: "复杂推理与综合创作" },
  { id: "openai/gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "OpenAI", description: "深度分析与高难任务" },
  { id: "anthropic/claude-opus-4.8", name: "Claude Opus 4.8", provider: "Anthropic", description: "长文本与精细表达" },
] as const

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"]
export const DEFAULT_CHAT_MODEL: ChatModelId = "mimo/mimo-v2.5-pro"
export const CHAT_MODEL_IDS = new Set<string>(CHAT_MODELS.map((model) => model.id))

export function getChatModel(id: string | undefined) {
  return CHAT_MODELS.find((model) => model.id === id) ?? CHAT_MODELS[0]
}
