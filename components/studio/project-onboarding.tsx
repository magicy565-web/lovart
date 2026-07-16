"use client"

import { useState } from "react"
import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react"
import { ArrowUpIcon, ImageIcon, LinkIcon, SparkleIcon } from "@phosphor-icons/react"
import { ComposerAddAttachment, ComposerAttachments } from "@/components/assistant-ui/attachment"
import { ModelSelector } from "@/components/assistant-ui/model-selector"

const ideas = [
  "为租房青年设计一款不打孔的模块化收纳系统",
  "为儿童设计一套安全、可替换笔头的马克笔",
]

export function ProjectOnboarding({ onStart }: { onStart: (prompt: string) => void }) {
  const aui = useAui()
  const [error, setError] = useState("")
  const text = useAuiState((state) => state.composer.text)
  const isRunning = useAuiState((state) => state.thread.isRunning)

  function start() {
    const prompt = text.trim()
    if (!prompt || isRunning) return
    setError("")
    onStart(prompt)
    try {
      aui.composer().send()
    } catch {
      setError("未能开始，请重试")
    }
  }

  return (
    <main className="studio-light flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-flame/25 bg-flame/10 text-flame">
          <SparkleIcon size={22} weight="fill" />
        </div>
        <p className="mt-5 font-mono text-xs font-semibold tracking-[0.22em] text-flame">启物</p>
        <h1 className="mt-3 max-w-2xl text-center font-serif text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          今天想创造什么产品？
        </h1>
        <p className="mt-4 max-w-xl text-center text-sm leading-6 text-muted-foreground sm:text-base">
          从一句灵感开始。Agent 会先帮你提炼产品种子和两个关键方向，由你决定后再进入完整创作流程。
        </p>

        <ComposerPrimitive.Root className="mt-10 w-full max-w-3xl rounded-3xl border border-border bg-card p-3 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.5)] transition-colors focus-within:border-flame/45">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            autoFocus
            aria-label="描述产品灵感"
            placeholder="例如：为经常出差的人设计一款能快速分类衣物的轻量旅行包"
            className="min-h-32 w-full resize-none bg-transparent px-3 py-3 text-base leading-7 outline-none placeholder:text-muted-foreground sm:min-h-40 sm:text-lg"
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                start()
              }
            }}
          />
          <div className="flex items-center gap-2 px-1 pb-1">
            <ComposerAddAttachment />
            <ModelSelector />
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><ImageIcon size={13} />支持图片</span>
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><LinkIcon size={13} />可粘贴链接</span>
            <button
              type="button"
              onClick={start}
              disabled={!text.trim() || isRunning}
              className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-flame px-4 text-sm font-semibold text-flame-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              开始
              <ArrowUpIcon size={15} weight="bold" />
            </button>
          </div>
        </ComposerPrimitive.Root>

        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => { aui.composer().setText(idea); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[aria-label="描述产品灵感"]')?.focus()) }}
              className="rounded-full border border-border bg-card px-4 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-flame/35 hover:text-foreground sm:text-sm"
            >
              {idea}
            </button>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Enter 开始 · Shift + Enter 换行</p>
      </div>
    </main>
  )
}
