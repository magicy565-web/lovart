"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react"

import { authClient } from "@/lib/auth-client"

type AuthMode = "login" | "register"

function messageForAuthError(error: { code?: string; message?: string; status?: number }) {
  const code = error.code?.toUpperCase() ?? ""
  if (error.status === 429 || code.includes("RATE_LIMIT")) return "尝试次数过多，请稍后再试。"
  if (code.includes("USER_ALREADY_EXISTS") || code.includes("EMAIL_ALREADY")) return "该邮箱已注册，请直接登录。"
  if (code.includes("INVALID_EMAIL")) return "请输入有效的邮箱地址。"
  if (code.includes("INVALID_PASSWORD") || code.includes("PASSWORD_TOO_SHORT")) return "密码至少需要 8 个字符。"
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("USER_NOT_FOUND")) return "邮箱或密码不正确。"
  return error.message || "操作未完成，请稍后重试。"
}

export function AuthForm({ mode, callbackUrl }: { mode: AuthMode; callbackUrl: string }) {
  const router = useRouter()
  const isRegister = mode === "register"
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const email = String(form.get("email") ?? "").trim().toLowerCase()
    const password = String(form.get("password") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")

    if (isRegister && name.length < 2) {
      setError("名称至少需要 2 个字符。")
      return
    }
    if (password.length < 8) {
      setError("密码至少需要 8 个字符。")
      return
    }
    if (isRegister && password !== confirmPassword) {
      setError("两次输入的密码不一致。")
      return
    }

    setPending(true)
    setError("")

    const result = isRegister
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })

    if (result.error) {
      setError(messageForAuthError(result.error))
      setPending(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
      {isRegister && (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">你的名称</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            autoFocus
            placeholder="例如：林墨"
            className="h-12 w-full rounded-md border border-border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
          />
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">邮箱</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          required
          autoFocus={!isRegister}
          placeholder="name@example.com"
          className="h-12 w-full rounded-md border border-border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">密码</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            maxLength={128}
            required
            placeholder={isRegister ? "至少 8 个字符" : "输入密码"}
            className="h-12 w-full rounded-md border border-border bg-background px-3.5 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            title={showPassword ? "隐藏密码" : "显示密码"}
            className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>

      {isRegister && (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">确认密码</span>
          <input
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            placeholder="再次输入密码"
            className="h-12 w-full rounded-md border border-border bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
          />
        </label>
      )}

      <div aria-live="polite" className="min-h-5">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {pending ? "正在处理" : isRegister ? "创建账户" : "登录"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "已有账户？" : "还没有账户？"}{" "}
        <Link
          href={`${isRegister ? "/login" : "/register"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          {isRegister ? "去登录" : "免费注册"}
        </Link>
      </p>
    </form>
  )
}
