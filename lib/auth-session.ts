import "server-only"

import { headers } from "next/headers"

import { auth } from "@/lib/auth"

export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
}

export async function getOptionalSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getOptionalSession()
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getOptionalUser()
  if (!user) throw new Error("需要登录后才能继续")
  return user
}
