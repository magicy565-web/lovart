import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCampaignBySlug } from "@/app/actions/campaign"
import { CampaignPublicPage } from "@/components/campaign/public-page"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getCampaignBySlug(slug)
  if (!data) return { title: "项目不存在 | 启物" }
  return {
    title: `${data.campaign.heroTitle} | 启物众筹`,
    description: data.campaign.heroSubtitle,
  }
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getCampaignBySlug(slug)
  if (!data) notFound()

  const {
    project,
    campaign,
    visuals,
    brief,
    foundation,
    snapshot,
    runtime,
    operating,
  } = data

  return (
    <CampaignPublicPage
      projectId={project.id}
      campaign={campaign}
      visuals={visuals}
      brief={brief}
      foundation={foundation}
      snapshot={snapshot}
      runtime={runtime}
      operating={operating}
    />
  )
}
