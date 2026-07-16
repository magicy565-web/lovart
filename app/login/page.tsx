import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AuthPage } from "@/components/auth/auth-page"
import { auth } from "@/lib/auth"
import { safeAuthCallback } from "@/lib/auth-redirect"

export const metadata: Metadata = {
  title: "登录 | 启物",
  description: "登录启物，继续推进你的产品企划。",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const callbackUrl = safeAuthCallback((await searchParams).callbackUrl)
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (currentSession) redirect(callbackUrl)
  return <AuthPage mode="login" callbackUrl={callbackUrl} />
}
