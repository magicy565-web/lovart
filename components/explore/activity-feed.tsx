"use client"

import Link from "next/link"

import type { ProjectActivityItem } from "@/features/explore/contracts"
import { activityLabel, relativeTime } from "@/lib/explore/categories"

interface ActivityFeedProps {
  items: ProjectActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-serif text-lg text-muted-foreground/50">还没有公开动态</p>
        <p className="mt-2 text-xs text-muted-foreground">
          当有人推进阶段、Fork 企划或认领任务时，会显示在这里。
        </p>
      </div>
    )
  }

  return (
    <ul className="mx-auto max-w-2xl space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/explore/${item.projectId}`}
            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm">
              {(item.actor?.name ?? "系")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{item.actor?.name ?? "系统"}</span>
                <span className="text-muted-foreground"> {activityLabel(item.type, item.metadata)} </span>
                {item.projectTitle && (
                  <span className="font-serif text-foreground/90">· {item.projectTitle}</span>
                )}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {relativeTime(item.createdAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
