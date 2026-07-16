"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MagnifyingGlass, Plus } from "@phosphor-icons/react"

import { getExploreProjects, getGlobalActivityFeed } from "@/app/actions/explore"
import type { ExploreCard, ExploreQuery, ProjectActivityItem } from "@/features/explore/contracts"
import {
  EXPLORE_CATEGORIES,
  EXPLORE_SORT_OPTIONS,
  EXPLORE_STATUS_OPTIONS,
  EXPLORE_VIEW_OPTIONS,
  type ExploreCategory,
} from "@/lib/explore/categories"
import { cn } from "@/lib/utils"

import { ActivityFeed } from "./activity-feed"
import { ForkDialog } from "./fork-dialog"
import { LineageOverview } from "./lineage-overview"
import { ProjectCard } from "./project-card"

interface ExplorePageProps {
  initialCards: ExploreCard[]
  initialHasMore?: boolean
  initialActivities?: ProjectActivityItem[]
}

function parseQuery(searchParams: URLSearchParams): ExploreQuery {
  const sortRaw = searchParams.get("sort") ?? "latest"
  const sort = (
    ["recommended", "active", "latest", "hot", "forked", "recruiting"] as const
  ).includes(sortRaw as ExploreQuery["sort"])
    ? (sortRaw as ExploreQuery["sort"])
    : "latest"

  const statusRaw = searchParams.get("status") ?? "all"
  const status = (["all", "wip", "published"] as const).includes(statusRaw as ExploreQuery["status"])
    ? (statusRaw as ExploreQuery["status"])
    : "all"

  const viewRaw = searchParams.get("view") ?? "feed"
  const view = (["feed", "activity", "lineage"] as const).includes(viewRaw as ExploreQuery["view"])
    ? (viewRaw as ExploreQuery["view"])
    : "feed"

  return {
    view,
    category: searchParams.get("category") ?? undefined,
    status,
    sort,
    q: searchParams.get("q") ?? undefined,
    collaboration: searchParams.get("collaboration") === "recruiting" ? "recruiting" : "all",
    limit: 24,
    offset: 0,
  }
}

export function ExplorePage({
  initialCards,
  initialHasMore = initialCards.length === 24,
  initialActivities = [],
}: ExplorePageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = useMemo(() => parseQuery(searchParams), [searchParams])

  const [cards, setCards] = useState<ExploreCard[]>(initialCards)
  const [activities, setActivities] = useState<ProjectActivityItem[]>(initialActivities)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [offset, setOffset] = useState(initialCards.length)
  const [searchDraft, setSearchDraft] = useState(query.q ?? "")
  const [forkCard, setForkCard] = useState<ExploreCard | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  const updateParams = useCallback(
    (patch: Record<string, string | undefined | null>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all" || value === "feed" || (key === "sort" && value === "latest")) {
          if (key === "view" && value === "feed") next.delete(key)
          else if (key === "sort" && value === "latest") next.delete(key)
          else if (!value || value === "all") next.delete(key)
          else next.set(key, value)
        } else {
          next.set(key, value)
        }
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      if (query.view === "activity") {
        const data = await getGlobalActivityFeed(50)
        if (requestId !== requestIdRef.current) return
        setActivities(data)
      } else {
        const data = await getExploreProjects({ ...query, offset: 0, limit: 24 })
        if (requestId !== requestIdRef.current) return
        setCards(data.items)
        setOffset(data.items.length)
        setHasMore(data.hasMore)
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (query.view !== "feed") return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading || !hasMore) return
        const requestId = ++requestIdRef.current
        setLoading(true)
        try {
          const more = await getExploreProjects({ ...query, offset, limit: 24 })
          if (requestId !== requestIdRef.current) return
          setCards((prev) => {
            const seen = new Set(prev.map((c) => c.projectId))
            return [...prev, ...more.items.filter((item) => !seen.has(item.projectId))]
          })
          setOffset((n) => n + more.items.length)
          setHasMore(more.hasMore)
        } finally {
          if (requestId === requestIdRef.current) setLoading(false)
        }
      },
      { rootMargin: "300px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, hasMore, offset, query])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ q: searchDraft.trim() || null })
  }

  const category = (query.category as ExploreCategory | undefined) ?? "全部"

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-lg font-semibold tracking-tight">灵感发现</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                看见产品如何被创造、验证和共同完成
              </p>
            </div>
            <form onSubmit={submitSearch} className="flex min-w-0 flex-1 max-w-md items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5">
              <MagnifyingGlass className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="搜索企划、创作者、产品方向…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                aria-label="搜索企划"
              />
            </form>
            <Link
              href="/studio"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
            >
              <Plus className="size-3.5" weight="bold" />
              <span className="hidden sm:inline">分享我的企划</span>
              <span className="sm:hidden">分享</span>
            </Link>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
            {EXPLORE_VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateParams({ view: opt.value })}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  query.view === opt.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {query.view !== "activity" && (
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
              {EXPLORE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => updateParams({ category: cat === "全部" ? null : cat })}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                    category === cat
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-8">
        {query.view === "feed" && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {EXPLORE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateParams({ status: opt.value })}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition-colors",
                      query.status === opt.value
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateParams({
                      collaboration: query.collaboration === "recruiting" ? null : "recruiting",
                      sort: query.collaboration === "recruiting" ? query.sort : "recruiting",
                    })
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    query.collaboration === "recruiting"
                      ? "bg-flame/15 text-flame"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  正在招募
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {EXPLORE_SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateParams({ sort: opt.value })}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition-colors",
                      query.sort === opt.value
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {cards.length === 0 && !loading ? (
              <EmptyState category={category} hasQuery={Boolean(query.q)} />
            ) : (
              <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5 [column-gap:12px]">
                {cards.map((card) => (
                  <div key={card.projectId} className="mb-3 break-inside-avoid">
                    <ProjectCard card={card} onFork={setForkCard} />
                  </div>
                ))}
                {loading && <SkeletonCards />}
              </div>
            )}

            <div ref={sentinelRef} className="h-1" />
            {!hasMore && cards.length > 0 && (
              <p className="mt-10 text-center text-xs text-muted-foreground/50">— 已显示全部内容 —</p>
            )}
          </>
        )}

        {query.view === "activity" && (
          <div className="py-2">
            {loading && activities.length === 0 ? <SkeletonList /> : <ActivityFeed items={activities} />}
          </div>
        )}

        {query.view === "lineage" && (
          <div className="py-2">
            {loading && cards.length === 0 ? <SkeletonList /> : <LineageOverview items={cards} />}
          </div>
        )}
      </main>

      <ForkDialog card={forkCard} open={Boolean(forkCard)} onClose={() => setForkCard(null)} />
    </div>
  )
}

function EmptyState({ category, hasQuery }: { category: string; hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="select-none font-serif text-4xl text-muted-foreground/20">无</div>
        <p className="text-sm font-medium text-muted-foreground">没有找到完全匹配的企划</p>
        <p className="max-w-sm text-xs text-muted-foreground/70">
          可以尝试查看相近产品方向、让 Agent 帮你拆解这个灵感，或直接创建一个新企划。
        </p>
        <Link
          href="/studio"
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground"
        >
          创建新企划
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="select-none font-serif text-4xl text-muted-foreground/20">空</div>
      <p className="text-sm font-medium text-muted-foreground">
        {category === "全部" ? "这个方向还没有人分享。" : `「${category}」方向还没有人分享。`}
      </p>
      <p className="text-xs text-muted-foreground/60">你可以成为第一个公开产品企划的人。</p>
      <Link
        href="/studio"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        分享我的企划
      </Link>
    </div>
  )
}

function SkeletonCards() {
  const heights = [180, 240, 160, 200, 220, 170, 190, 210]
  return (
    <>
      {heights.map((h, i) => (
        <div
          key={i}
          className="mb-3 break-inside-avoid animate-pulse rounded-2xl bg-card"
          style={{ height: h }}
        />
      ))}
    </>
  )
}

function SkeletonList() {
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  )
}
