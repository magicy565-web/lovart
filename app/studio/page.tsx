import { randomUUID } from "node:crypto"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Studio } from "@/components/studio/studio"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "无限画布工作台 | 启物",
  description: "在无限画布中与设计智能体协作，生成、编排并完善你的产品发布视觉。",
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project } = await searchParams
  const currentSession = await auth.api.getSession({ headers: await headers() })
  const callbackUrl = project ? `/studio?project=${encodeURIComponent(project)}` : "/studio"
  if (!currentSession) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  if (!project) redirect(`/studio?project=${randomUUID()}`)
  return <Studio projectId={project} />
}
