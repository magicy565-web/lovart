import Image from "next/image"
import Link from "next/link"

import { AuthForm } from "@/components/auth/auth-form"
import { LogoMark } from "@/components/landing/logo-mark"

export function AuthPage({ mode, callbackUrl }: { mode: "login" | "register"; callbackUrl: string }) {
  const isRegister = mode === "register"

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden min-h-svh overflow-hidden lg:block" aria-label="启物产品创作案例">
        <Image
          src="/images/northloop-forest.png"
          alt="由启物工作流完成的户外背包产品视觉"
          fill
          priority
          className="object-cover"
          sizes="45vw"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="max-w-md font-serif text-3xl font-semibold leading-tight">从一个产品想法，到可验证的发布方案。</p>
          <p className="mt-3 text-sm text-white/75">Northloop 户外系列 · 启物工作流案例</p>
        </div>
      </section>

      <section className="relative flex min-h-svh items-center justify-center px-6 py-20 sm:px-10">
        <Link href="/" className="absolute left-6 top-6 flex items-center gap-2 sm:left-10 sm:top-8">
          <LogoMark className="size-7" />
          <span className="text-lg font-bold">启物</span>
        </Link>

        <div className="w-full max-w-md">
          <p className="text-xs font-medium uppercase text-muted-foreground">QIWU ACCOUNT</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
            {isRegister ? "创建你的启物账户" : "欢迎回来"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isRegister ? "保存你的产品企划，并在不同设备上持续推进。" : "登录后继续推进你的产品企划。"}
          </p>
          <AuthForm mode={mode} callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  )
}
