import Link from "next/link"

export default function ExploreProjectNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-serif text-2xl text-muted-foreground/40">企划不存在或未公开</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        它可能已被撤回，或你没有访问权限。回到灵感发现继续浏览其他正在生长的产品。
      </p>
      <Link
        href="/explore"
        className="rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground"
      >
        返回灵感发现
      </Link>
    </div>
  )
}
