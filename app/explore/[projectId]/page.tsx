import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getExploreProjectDetail } from "@/app/actions/explore"
import { ProjectLivePage } from "@/components/explore/project-live-page"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params
  try {
    const detail = await getExploreProjectDetail(projectId)
    if (!detail) return { title: "企划未找到 | 启物" }
    return {
      title: `${detail.project.title} | 灵感发现`,
      description: detail.project.activeSummary || detail.project.summary || "公开产品企划现场",
    }
  } catch {
    return { title: "企划 | 灵感发现" }
  }
}

export default async function ExploreProjectPage({ params }: PageProps) {
  const { projectId } = await params
  const detail = await getExploreProjectDetail(projectId)
  if (!detail) {
    notFound()
  }

  return <ProjectLivePage detail={detail} />
}
