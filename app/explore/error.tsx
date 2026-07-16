"use client"

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-serif text-2xl text-muted-foreground/40">灵感发现暂时不可用</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {error.message || "加载失败，请稍后重试。已加载的内容不会因后续请求失败而清空。"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground"
      >
        重试
      </button>
    </div>
  )
}
