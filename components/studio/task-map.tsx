"use client"

import { CheckCircleIcon, CircleIcon, CircleNotchIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type TaskMapItem = { id: string; status: string; title: string; agentNote: string }

export function TaskMap({ tasks }: { tasks: TaskMapItem[] }) {
  const doneCount = tasks.filter((t) => t.status === "done").length

  return (
    <nav aria-label="发布任务地图" className="flex flex-col gap-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-medium text-muted-foreground">任务地图</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {doneCount}/{tasks.length}
        </p>
      </div>
      <ol className="flex flex-col">
        {tasks.map((task, index) => {
          const isRunning = task.status === "running"
          const isDone = task.status === "done"
          return (
            <li key={task.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < tasks.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute left-[9px] top-5 h-full w-px", isDone ? "bg-primary/40" : "bg-border")}
                />
              )}
              <span className="relative z-10 mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircleIcon weight="fill" className="size-[18px] text-primary" />
                ) : isRunning ? (
                  <CircleNotchIcon className="size-[18px] animate-spin text-primary" />
                ) : (
                  <CircleIcon className="size-[18px] text-muted-foreground/40" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isDone ? "text-foreground" : isRunning ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {task.title}
                </p>
                {(isRunning || isDone) && task.agentNote && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{task.agentNote}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
