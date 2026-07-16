"use client"

import { LogOut, PanelsTopLeft, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

export function AccountNav() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <div className="h-10 w-36 animate-pulse rounded-md bg-muted" aria-hidden="true" />

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <a href="/login" className="hidden px-3 py-2 text-sm text-foreground/80 transition-colors hover:text-foreground sm:block">
          登录
        </a>
        <a href="/register" className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          免费注册
        </a>
      </div>
    )
  }

  const initial = session.user.name.trim().charAt(0).toUpperCase() || <UserRound className="size-4" />

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="flex h-10 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted" aria-label="打开账户菜单" />
        }
      >
        <Avatar size="sm">
          {session.user.image && <AvatarImage src={session.user.image} alt="" />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate sm:block">{session.user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{session.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/studio")}>
          <PanelsTopLeft />工作台
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
