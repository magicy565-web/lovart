import { Suspense } from "react"
import type { Metadata } from "next"

import { getExploreInitial, getGlobalActivityFeed } from "@/app/actions/explore"
import { ExplorePage } from "@/components/explore/explore-page"

export const metadata: Metadata = {
  title: "灵感发现 | 启物",
  description: "浏览其他创作者正在推进和发布的产品设计，获取灵感，Fork 或加入共创。",
}

export default async function ExploreRoute() {
  const [initial, activities] = await Promise.all([
    getExploreInitial(),
    getGlobalActivityFeed(30),
  ])

  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExplorePage
        initialCards={initial.items}
        initialHasMore={initial.hasMore}
        initialActivities={activities}
      />
    </Suspense>
  )
}

function ExploreFallback() {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-card" />
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5">
          {[180, 240, 160, 200, 220, 170, 190, 210].map((h, i) => (
            <div key={i} className="mb-3 break-inside-avoid animate-pulse rounded-2xl bg-card" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  )
}
