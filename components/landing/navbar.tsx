'use client'

import Link from 'next/link'
import { AccountNav } from './account-nav'
import { LogoMark } from './logo-mark'

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background/85 backdrop-blur-md">
      <nav aria-label="主导航" className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="text-lg font-bold tracking-tight">启物</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-sm text-foreground/80 md:flex">
          <Link href="/" className="transition-colors hover:text-foreground">
            首页
          </Link>
          <Link href="/explore" className="transition-colors hover:text-foreground">
            灵感发现
          </Link>
          <Link href="#features" className="transition-colors hover:text-foreground">
            功能
          </Link>
        </div>

        <AccountNav />
      </nav>
    </header>
  )
}
