"use server"

import { headers } from "next/headers"

import {
  campaignEmailSchema,
  campaignProjectIdSchema,
  campaignSlugSchema,
  campaignTierSchema,
  campaignLimitSchema,
} from "@/features/campaign/contracts"
import * as campaign from "@/features/campaign/server/service"

export async function getCampaignBySlug(slug: string) {
  return campaign.getCampaignBySlug(campaignSlugSchema.parse(slug))
}

export async function trackVisit(projectId: string) {
  return campaign.trackVisit(campaignProjectIdSchema.parse(projectId))
}

export async function trackCtaClick(projectId: string) {
  return campaign.trackCtaClick(campaignProjectIdSchema.parse(projectId))
}

export async function submitEmail(projectId: string, email: string, website = "") {
  const parsed = campaignEmailSchema.safeParse(email)
  if (!parsed.success) return { ok: false as const, error: "请输入有效的邮箱地址" }
  const headerStore = await headers()
  const clientKey = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local"
  return campaign.submitEmail(campaignProjectIdSchema.parse(projectId), parsed.data, website.slice(0, 200), clientKey)
}

export async function submitEarlyBird(projectId: string, email: string, tierName: string, website = "") {
  const parsed = campaignEmailSchema.safeParse(email)
  if (!parsed.success) return { ok: false as const, error: "请输入有效的邮箱地址" }
  const headerStore = await headers()
  const clientKey = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local"
  return campaign.submitEarlyBird(
    campaignProjectIdSchema.parse(projectId),
    parsed.data,
    campaignTierSchema.parse(tierName),
    website.slice(0, 200),
    clientKey,
  )
}

export async function listIntentLeads(projectId: string, limit = 30) {
  return campaign.listIntentLeads(
    campaignProjectIdSchema.parse(projectId),
    campaignLimitSchema.parse(limit),
  )
}
