import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AuthPage } from "@/components/auth/auth-page"
import { auth } from "@/lib/auth"
import { safeAuthCallback } from "@/lib/auth-redirect"

export const metadata: Metadata = {
  title: "注册 | 启物",
  description: "创建启物账户，保存并持续推进你的产品企划。",
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const callbackUrl = safeAuthCallback((await searchParams).callbackUrl)
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (currentSession) redirect(callbackUrl)
  return <AuthPage mode="register" callbackUrl={callbackUrl} />
}
