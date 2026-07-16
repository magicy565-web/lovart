"use client"

import Link from "next/link"

import type { ExploreCard } from "@/features/explore/contracts"

interface LineageOverviewProps {
  items: ExploreCard[]
}

export function LineageOverview({ items }: LineageOverviewProps) {
  const roots = items.filter((item) => !item.lineage.forkedFromProjectId || item.lineage.forkDepth === 0)
  const children = items.filter((item) => item.lineage.forkedFromProjectId)

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-serif text-lg text-muted-foreground/50">还没有可展示的分支关系</p>
        <p className="mt-2 text-xs text-muted-foreground">当公开企划被 Fork 后，会在这里形成演化地图。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        一期为简化只读图谱：展示公开企划及其已知 Fork 子节点。
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(roots.length ? roots : items).map((root) => {
          const forks = children.filter(
            (child) =>
              child.lineage.forkedFromProjectId === root.projectId ||
              child.lineage.rootProjectId === root.projectId,
          )
          return (
            <article key={root.projectId} className="rounded-3xl border border-border bg-card p-4">
              <Link href={`/explore/${root.projectId}`} className="block">
                <p className="font-serif text-base font-semibold leading-snug">{root.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{root.activeSummary}</p>
              </Link>
              <div className="mt-4 space-y-2 border-l border-border/80 pl-3">
                {forks.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">暂无公开分支</p>
                ) : (
                  forks.map((fork) => (
                    <Link
                      key={fork.projectId}
                      href={`/explore/${fork.projectId}`}
                      className="block rounded-xl bg-secondary/50 px-3 py-2 transition-colors hover:bg-secondary"
                    >
                      <p className="text-xs font-medium">{fork.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        depth {fork.lineage.forkDepth}
                        {fork.creator ? ` · @${fork.creator.name}` : ""}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
