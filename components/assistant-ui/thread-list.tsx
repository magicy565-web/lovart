"use client"

import { ChatCircleIcon, NotePencilIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import type { LocalThread } from "@/lib/thread-store"
import { cn } from "@/lib/utils"

export function ThreadList({ threads, activeId, onCreate, onSelect, onRename, onDelete }: { threads: LocalThread[]; activeId: string; onCreate: () => void; onSelect: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void }) {
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div><p className="text-sm font-semibold">项目会话</p><p className="text-xs text-muted-foreground">仅保存在此浏览器</p></div>
      <button type="button" onClick={onCreate} className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform active:scale-95" aria-label="新建会话"><PlusIcon size={15} weight="bold" /></button>
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
      {threads.map((thread) => <button key={thread.id} type="button" onClick={() => onSelect(thread.id)} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", thread.id === activeId ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", thread.id === activeId ? "bg-foreground text-background" : "bg-muted")}><ChatCircleIcon size={15} weight={thread.id === activeId ? "fill" : "regular"} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{thread.title}</span><span className="block text-xs text-muted-foreground">{thread.messages.length} 条消息 · {new Date(thread.updatedAt).toLocaleDateString("zh-CN")}</span></span>
        <span className="hidden items-center gap-1 group-hover:flex">
          <span role="button" tabIndex={0} aria-label="重命名会话" className="flex size-7 items-center justify-center rounded-md hover:bg-background" onClick={(event) => { event.stopPropagation(); const title = window.prompt("重命名会话", thread.title); if (title?.trim()) onRename(thread.id, title.trim()) }}><NotePencilIcon size={14} /></span>
          <span role="button" tabIndex={0} aria-label="删除会话" className="flex size-7 items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive" onClick={(event) => { event.stopPropagation(); onDelete(thread.id) }}><TrashIcon size={14} /></span>
        </span>
      </button>)}
    </div>
  </div>
}
