"use client"

import useSWR from "swr"
import { getProjectState, getSignalCounts } from "@/app/actions/studio"
import { listIntentLeads } from "@/app/actions/campaign"
import type { ArtifactContent, StudioArtifact, StudioArtifactRevision } from "@/lib/studio/types"

export function useProject(projectId: string | null) {
  const { data, mutate, isLoading, error } = useSWR(
    projectId ? ["project", projectId] : null,
    () => getProjectState(projectId!),
    { revalidateOnFocus: false },
  )
  return { state: data ?? null, mutate, isLoading, error }
}

export const SIGNAL_METRIC_KEYS = ["visit", "cta_click", "email", "earlybird"] as const

export type SignalMetricKey = (typeof SIGNAL_METRIC_KEYS)[number]

export const SIGNAL_METRIC_LABELS: Record<SignalMetricKey, string> = {
  visit: "访问",
  cta_click: "CTA",
  email: "留资",
  earlybird: "早鸟预约",
}

export function useSignalCounts(projectId: string | null, published: boolean) {
  const { data, mutate, isLoading } = useSWR(
    projectId ? ["signals", projectId] : null,
    () => getSignalCounts(projectId!),
    {
      refreshInterval: published ? 5000 : 0,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    },
  )
  const counts = data ?? {}
  const totalIntent = Number(counts.email ?? 0) + Number(counts.earlybird ?? 0)
  return {
    counts,
    totalIntent,
    isLoading,
    mutateSignals: mutate,
  }
}


export type IntentLead = {
  id: string
  maskedEmail: string
  tierName: string
  kind: "email" | "earlybird"
  status: string
  createdAt: string
}

export function useIntentLeads(projectId: string | null, published: boolean) {
  const { data, mutate, isLoading } = useSWR(
    projectId && published ? ["intent-leads", projectId] : null,
    () => listIntentLeads(projectId!, 30),
    {
      refreshInterval: published ? 8000 : 0,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    },
  )
  return {
    leads: (data ?? []) as IntentLead[],
    isLoading,
    mutateLeads: mutate,
  }
}

export function currentContentOf(artifact: StudioArtifact, revisions: StudioArtifactRevision[]): ArtifactContent | null {
  const revision = revisions.find((r) => r.id === artifact.currentRevisionId)
  return revision?.content ?? null
}

export function revisionsOf(artifact: StudioArtifact, revisions: StudioArtifactRevision[]): StudioArtifactRevision[] {
  return revisions.filter((r) => r.artifactId === artifact.id).sort((a, b) => b.version - a.version)
}
