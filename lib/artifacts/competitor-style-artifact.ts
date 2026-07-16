export type CompetitorStyleProduct = {
  productId: string
  title: string
  productUrl: string
  sellerName: string
  price: string
  rating?: number
  soldCount?: number
  salesLabel?: string
  imageUrls: string[]
}

export type CompetitorReferenceImage = {
  id: string
  url: string
  productId: string
  productTitle: string
  productUrl: string
  sellerName: string
}

export type CompetitorStyleProfile = {
  summary: string
  palette: string[]
  lighting: string
  composition: string
  background: string
  materials: string[]
  visualMotifs: string[]
  avoid: string[]
  designPrompt: string
}

export type VisualDirection = {
  id: string
  title: string
  description: string
  prompt: string
}

export type CompetitorStyleArtifact = {
  version: 1
  source: "tiktok-shop"
  topic: string
  query: string
  designGoal: string
  products: CompetitorStyleProduct[]
  referenceImages: CompetitorReferenceImage[]
  styleProfile: CompetitorStyleProfile
  visualDirections: VisualDirection[]
  budget: { maxUsd: number; estimatedActorUsd: number }
  warnings: string[]
  createdAt: string
}
