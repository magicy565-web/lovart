"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { AssistantRuntimeProvider } from "@assistant-ui/react"
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk"
import { toPng } from "html-to-image"
import { AnimatePresence, motion } from "motion/react"
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels"
import {
  CaretDownIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  KeyboardIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  SidebarSimpleIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react"
import { Thread } from "@/components/assistant-ui/thread"
import { ThreadList } from "@/components/assistant-ui/thread-list"
import { GenerateImageToolUI } from "@/components/studio/generate-image-tool"
import { CreateBriefToolUI } from "@/components/studio/create-brief-tool"
import { ResearchMarketToolUI } from "@/components/studio/research-tool"
import { TikTokCompetitorToolUI } from "@/components/studio/tiktok-competitor-tool"
import { ProductSeedToolUI } from "@/components/studio/product-seed-tool"
import { ArtifactPanel } from "@/components/studio/artifact-panel"
import { ProjectOnboarding } from "@/components/studio/project-onboarding"
import { StudioCanvas } from "@/components/studio/canvas"
import { CanvasPersistence } from "@/components/studio/canvas-persistence"
import { LogoMark } from "@/components/landing/logo-mark"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useCanvasStore } from "@/lib/canvas-store"
import { useDirectionStore } from "@/lib/studio/direction-store"
import { useProcessStore } from "@/lib/studio/process-store"
import { newThread, readThreads, titleFromMessages, writeThreads, type LocalThread } from "@/lib/thread-store"
import { useChatModelStore } from "@/lib/chat-model-store"
import { getProjectState, initializeProjectPipeline } from "@/app/actions/studio"
import { ShareDialog } from "@/components/explore/share-dialog"
import { cn } from "@/lib/utils"

const shortcuts: { keys: string; action: string }[] = [
  { keys: "V", action: "选择工具" },
  { keys: "H", action: "抓手工具" },
  { keys: "F", action: "Frame" },
  { keys: "R / O / L", action: "矩形 / 圆形 / 直线" },
  { keys: "P", action: "铅笔" },
  { keys: "T", action: "文字" },
  { keys: "A", action: "图像生成器" },
  { keys: "⌘ Z / ⌘ ⇧ Z", action: "撤销 / 重做" },
  { keys: "⌘ C / X / V", action: "复制 / 剪切 / 粘贴" },
  { keys: "⌘ D", action: "创建副本" },
  { keys: "⌘ G / ⌘ ⇧ G", action: "编组 / 解组" },
  { keys: "⌘ ⇧ H / ⌘ ⇧ L", action: "隐藏 / 锁定" },
  { keys: "] / [", action: "置顶 / 置底" },
  { keys: "⌘ ] / ⌘ [", action: "上移 / 下移一层" },
  { keys: "Delete", action: "删除所选" },
  { keys: "Space + 拖动", action: "平移画布" },
]

export function Studio({ projectId }: { projectId: string }) {
  const onboardingRequest = useRef(false)
  const [canvasChecked, setCanvasChecked] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [threads, setThreads] = useState<LocalThread[]>(() => {
    const saved = readThreads(projectId)
    return saved.length ? saved : [newThread()]
  })
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0].id)
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
  const runtime = useChatRuntime({
    id: activeThread.id,
    messages: activeThread.messages as never[],
    onFinish: ({ messages, isError }) => {
      if (isError) return
      setThreads((current) => {
        const storedMessages = messages as unknown as LocalThread["messages"]
        const next = current.map((thread) => thread.id === activeThreadId ? { ...thread, messages: storedMessages, title: thread.title === "新对话" ? titleFromMessages(storedMessages) : thread.title, updatedAt: Date.now() } : thread)
        writeThreads(projectId, next)
        return next
      })
    },
    transport: new AssistantChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ body, messages, id, trigger, messageId }) => {
        // 随每条消息附带画布内容摘要，让 Agent 感知选区与画布状态
        const { items, selectedIds } = useCanvasStore.getState()
        const summarize = (list: typeof items) =>
          list.slice(0, 30).map((item) => ({
            id: item.id,
            type: item.type,
            title: item.title,
            text: item.text?.slice(0, 200),
            prompt: item.prompt?.slice(0, 200),
            hasImage: Boolean(item.src),
            stale: item.stale,
            productBrief: item.brief ? {
              productId: item.brief.productId,
              status: item.brief.status,
              version: item.brief.version,
              confirmedAt: item.brief.confirmedAt,
              confirmedHash: item.brief.confirmedHash,
              productName: item.brief.productName,
              audience: item.brief.audience,
              productForm: item.brief.form,
              painPoints: item.brief.painPoints,
              sellingPoints: item.brief.sellingPoints,
              targetPrice: item.brief.retailPrice,
            } : undefined,
            x: Math.round(item.x),
            y: Math.round(item.y),
            width: Math.round(item.width),
            height: Math.round(item.height),
          }))
        const onboarding = onboardingRequest.current
        onboardingRequest.current = false
        const confirmedDirection = useDirectionStore.getState().consumeIfMatched(messages)
        if (confirmedDirection) useProcessStore.getState().confirmDirection(confirmedDirection.parentId, confirmedDirection)
        return {
          body: {
            ...body,
            onboarding,
            confirmedDirection,
            id,
            messages,
            trigger,
            messageId,
            projectContext: { projectId },
            config: useChatModelStore.getState(),
            canvasContext: {
              totalItems: items.length,
              selected: summarize(items.filter((item) => selectedIds.includes(item.id))),
              items: summarize(items),
            },
          },
        }
      },
    }),
  })
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<"agent" | "artifacts" | "history">("agent")
  const [title, setTitle] = useState("未命名发布企划")
  const [initialPrompt, setInitialPrompt] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [forkOrigin, setForkOrigin] = useState<{ id: string; title: string } | null>(null)
  const renameInput = useRef<HTMLInputElement>(null)
  const agentPanelRef = useRef<ImperativePanelHandle>(null)
  const selectedIds = useCanvasStore((state) => state.selectedIds)
  const itemCount = useCanvasStore((state) => state.items.length)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch(`/api/canvas?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() as Promise<{ document?: { items?: unknown[] } | null }> : null),
      getProjectState(projectId).catch(() => null),
    ])
      .then(([payload, projectState]) => {
        if (cancelled) return
        const hasSavedCanvas = Boolean(payload?.document?.items?.length)
        const hasMessages = threads.some((thread) => thread.messages.length > 0)
        setIsNewProject(!projectState && !hasSavedCanvas && !hasMessages)
        if (projectState?.project) {
          const project = projectState.project as {
            name?: string
            visibility?: string
            coverImage?: string | null
            forkedFromProjectId?: string | null
            activeSummary?: string | null
          }
          if (project.name) setTitle(project.name)
          setIsPublic(project.visibility === "public")
          setCoverImage(project.coverImage ?? null)
          if (projectState.forkOrigin) {
            setForkOrigin(projectState.forkOrigin as { id: string; title: string })
          }
        }
        setCanvasChecked(true)
      })
      .catch(() => { if (!cancelled) setCanvasChecked(true) })
    return () => { cancelled = true }
  }, [projectId, threads])

  useEffect(() => {
    if (!canvasChecked || isNewProject) return
    void initializeProjectPipeline(projectId, title, initialPrompt).catch(() => undefined)
  }, [canvasChecked, initialPrompt, isNewProject, projectId, title])

  const persistThreads = useCallback((next: LocalThread[]) => { setThreads(next); writeThreads(projectId, next) }, [projectId])
  const createConversation = useCallback(() => { const thread = newThread(); persistThreads([thread, ...threads]); setActiveThreadId(thread.id); setPanelTab("agent") }, [persistThreads, threads])
  const selectConversation = useCallback((id: string) => { setActiveThreadId(id); setPanelTab("agent") }, [])
  const renameConversation = useCallback((id: string, nextTitle: string) => persistThreads(threads.map((thread) => thread.id === id ? { ...thread, title: nextTitle, updatedAt: Date.now() } : thread)), [persistThreads, threads])
  const deleteConversation = useCallback((id: string) => { const remaining = threads.filter((thread) => thread.id !== id); const next = remaining.length ? remaining : [newThread()]; persistThreads(next); if (id === activeThreadId) setActiveThreadId(next[0].id) }, [activeThreadId, persistThreads, threads])

  const openPanel = useCallback(() => {
    agentPanelRef.current?.expand()
    setPanelOpen(true)
  }, [])
  const closePanel = useCallback(() => {
    agentPanelRef.current?.collapse()
    setPanelOpen(false)
  }, [])
  const hydrateTitle = useCallback((savedTitle: string) => {
    if (savedTitle.trim()) setTitle(savedTitle)
  }, [])

  useEffect(() => {
    const handleBriefCreated = (event: Event) => {
      const nextTitle = (event as CustomEvent<{ title?: string }>).detail?.title?.trim()
      if (nextTitle) setTitle(nextTitle)
    }
    window.addEventListener("studio:brief-created", handleBriefCreated)
    return () => window.removeEventListener("studio:brief-created", handleBriefCreated)
  }, [])

  async function exportCanvas() {
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport")
    if (!viewport || exporting) return
    setExporting(true)
    try {
      const url = await toPng(viewport, { pixelRatio: 2, cacheBust: true, backgroundColor: "#faf9f7" })
      const a = document.createElement("a")
      a.href = url
      a.download = `${title}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  async function shareLink() {
    await navigator.clipboard.writeText(window.location.href)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  return (
    <AssistantRuntimeProvider key={activeThreadId} runtime={runtime}>
      <GenerateImageToolUI />
      <CreateBriefToolUI />
      <ResearchMarketToolUI />
      <TikTokCompetitorToolUI />
      <ProductSeedToolUI />
      {!canvasChecked ? (
        <div className="studio-light flex h-dvh items-center justify-center bg-background text-foreground"><span className="size-2 animate-pulse rounded-full bg-flame" /><span className="sr-only">正在加载项目</span></div>
      ) : isNewProject ? (
        <ProjectOnboarding onStart={(prompt) => { onboardingRequest.current = true; setInitialPrompt(prompt); setIsNewProject(false) }} />
      ) : (
      <div className="studio-light flex h-dvh flex-col bg-background text-foreground">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3" aria-label="工作台顶栏">
          <Link href="/" className="flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-muted" aria-label="返回首页">
            <LogoMark className="size-6" />
          </Link>
          <Separator orientation="vertical" className="h-5" />
          {renaming ? (
            <input
              ref={renameInput}
              defaultValue={title}
              autoFocus
              aria-label="项目名称"
              className="w-52 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold outline-none focus:border-foreground/30"
              onBlur={(e) => { setTitle(e.target.value.trim() || title); setRenaming(false) }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setRenaming(false)
              }}
            />
          ) : (
            <button type="button" onClick={() => setRenaming(true)} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted" aria-label="重命名项目">
              <span className="truncate text-sm font-semibold">{title}</span>
              <CaretDownIcon size={13} weight="bold" className="text-muted-foreground" />
            </button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/explore"
              className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              灵感发现
            </Link>
            <ShareDialog
              projectId={projectId}
              projectName={title}
              coverImage={coverImage}
              isPublic={isPublic}
            >
              <Button variant="ghost" size="sm" className="max-sm:hidden">
                <ShareNetworkIcon data-icon="inline-start" />
                {isPublic ? "已公开" : "分享到灵感发现"}
              </Button>
            </ShareDialog>
            <Button variant="outline" size="sm" onClick={() => void exportCanvas()} disabled={exporting}>
              <DownloadSimpleIcon data-icon="inline-start" />
              {exporting ? "导出中…" : "导出"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="更多操作" />}><DotsThreeIcon weight="bold" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setRenaming(true)}>重命名项目</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void shareLink()}><LinkSimpleIcon />复制链接</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      /* ShareDialog trigger is separate; copy explore link if public */
                      void navigator.clipboard.writeText(
                        isPublic
                          ? `${window.location.origin}/explore/${projectId}`
                          : window.location.href,
                      )
                      setShareCopied(true)
                      setTimeout(() => setShareCopied(false), 2000)
                    }}
                  >
                    <ShareNetworkIcon />
                    {shareCopied ? "已复制" : isPublic ? "复制公开链接" : "复制工作台链接"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}><KeyboardIcon />查看快捷键</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {!panelOpen && <Button size="sm" onClick={openPanel}><SparkleIcon data-icon="inline-start" weight="fill" />打开 Agent</Button>}
          </div>
        </header>

        {forkOrigin && (
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
            <span>
              Fork 自「
              <Link href={`/explore/${forkOrigin.id}`} className="font-medium text-flame hover:underline">
                {forkOrigin.title}
              </Link>
              」
            </span>
            <span className="text-border">·</span>
            <Link href={`/explore/${forkOrigin.id}`} className="hover:text-foreground">
              查看原企划 →
            </Link>
          </div>
        )}

        <PanelGroup direction="horizontal" autoSaveId="studio-layout" className="min-h-0 flex-1 !flex-row-reverse">
          <Panel defaultSize={68} minSize={38}>
            <main className="relative size-full" aria-label="无限画布工作区">
              <CanvasPersistence projectId={projectId} title={title} onHydrateTitle={hydrateTitle} />
              <StudioCanvas />
            </main>
          </Panel>

          <PanelResizeHandle
            className={cn(
              "group relative w-px shrink-0 bg-border outline-none transition-colors data-[resize-handle-state=drag]:bg-primary data-[resize-handle-state=hover]:bg-primary/60",
              !panelOpen && "pointer-events-none opacity-0",
            )}
            aria-label="调整 Agent 面板宽度"
          >
            <span aria-hidden className="absolute inset-y-0 -left-1.5 -right-1.5 z-10 cursor-col-resize" />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:bg-primary group-data-[resize-handle-state=drag]:opacity-100"
            />
          </PanelResizeHandle>

          <Panel
            ref={agentPanelRef}
            defaultSize={32}
            minSize={24}
            maxSize={50}
            collapsible
            collapsedSize={0}
            onCollapse={() => setPanelOpen(false)}
            onExpand={() => setPanelOpen(true)}
          >
            <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-card" aria-label="Agent 面板">
              <div className="flex h-12 shrink-0 items-center border-b border-border px-3">
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  <button type="button" onClick={() => setPanelTab("agent")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors", panelTab === "agent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><SparkleIcon size={14} weight={panelTab === "agent" ? "fill" : "regular"} />Agent</button>
                  <button type="button" onClick={() => setPanelTab("artifacts")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors", panelTab === "artifacts" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><CheckCircleIcon size={14} weight={panelTab === "artifacts" ? "fill" : "regular"} />产物</button>
                  <button type="button" onClick={() => setPanelTab("history")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors", panelTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><ClockCounterClockwiseIcon size={14} weight={panelTab === "history" ? "fill" : "regular"} />会话</button>
                </div>
                <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={closePanel} aria-label="收起 Agent 面板"><SidebarSimpleIcon className="-scale-x-100" /></Button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={panelTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {panelTab === "agent" ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                      {selectedIds.length > 0 && <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">当前引用：已选 {selectedIds.length} 个画布对象</div>}
                      <div className="min-h-0 flex-1"><Thread /></div>
                    </div>
                  ) : panelTab === "artifacts" ? (
                    <ArtifactPanel projectId={projectId} title={title} initialPrompt={initialPrompt} />
                  ) : (
                    <ThreadList threads={threads} activeId={activeThreadId} onCreate={createConversation} onSelect={selectConversation} onRename={renameConversation} onDelete={deleteConversation} />
                  )}
                </motion.div>
              </AnimatePresence>
            </aside>
          </Panel>
        </PanelGroup>

        <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-card px-3 text-[11px] text-muted-foreground" aria-label="工作台状态栏">
          <span className="tabular-nums">{itemCount} 个对象</span>
          {selectedIds.length > 0 && (
            <>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="tabular-nums text-foreground/80">已选 {selectedIds.length}</span>
            </>
          )}
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="truncate">{title}</span>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            <KeyboardIcon size={13} />
            快捷键
          </button>
        </footer>

        {shortcutsOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="键盘快捷键"
            tabIndex={-1}
            ref={(node) => node?.focus()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 outline-none"
            onClick={() => setShortcutsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShortcutsOpen(false)
            }}
          >
            <div
              className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">键盘快捷键</h2>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  className="rounded-lg p-1 hover:bg-muted"
                  aria-label="关闭"
                >
                  <XIcon size={16} />
                </button>
              </div>
              <ul className="overflow-y-auto p-3">
                {shortcuts.map((item) => (
                  <li
                    key={item.keys}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs hover:bg-muted/60"
                  >
                    <span className="text-muted-foreground">{item.action}</span>
                    <kbd className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px]">
                      {item.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      )}
    </AssistantRuntimeProvider>
  )
}
