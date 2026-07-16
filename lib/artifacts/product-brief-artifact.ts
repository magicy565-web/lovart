export type ProductBriefStatus = "draft" | "confirmed"

export type ProductBriefTask = {
  title: string
  note: string
}
export type BriefData = {
  productId: string
  status: ProductBriefStatus
  version: number
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  confirmedHash?: string
  productName: string
  tagline: string
  audience: string
  form: string
  painPoints: string[]
  sellingPoints: string[]
  retailPrice: number
  earlyBirdPrice: number
  risks: string[]
  tasks: ProductBriefTask[]
}
