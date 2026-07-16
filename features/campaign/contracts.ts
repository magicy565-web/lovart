import { z } from "zod"

export const campaignSlugSchema = z.string().trim().min(1).max(160)
export const campaignProjectIdSchema = z.string().uuid()
export const campaignEmailSchema = z.string().trim().toLowerCase().email().max(320)
export const campaignTierSchema = z.string().trim().min(1).max(120)
export const campaignLimitSchema = z.number().int().min(1).max(100).default(30)

export type CampaignTierAvailability = {
  tierId: string
  tierName: string
  reserved: number
  remaining: number | null
  soldOut: boolean
}

export type CampaignRuntimeState = {
  reservationCount: number
  tierReservationCount: number
  reservedValue: number
  tierAvailability: CampaignTierAvailability[]
}

export type CampaignOperatingState = {
  creator: { id: string; name: string; image: string | null } | null
  approvedEvidenceCount: number
  lastEvidenceCheckpoint: string | null
  faqCount: number
}
