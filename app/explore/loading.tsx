export default function ExploreLoading() {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-card" />
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5">
          {[180, 240, 160, 200, 220, 170, 190, 210].map((h, i) => (
            <div
              key={i}
              className="mb-3 break-inside-avoid animate-pulse rounded-2xl bg-card"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
