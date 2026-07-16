"use client"

import { create } from "zustand"
import type { BriefData, MarketEvidenceData, ProductDirection, ProductSeedData, ResearchData } from "@/lib/studio/process-types"

type ProcessState = {
  productSeeds: Record<string, ProductSeedData>
  briefs: Record<string, BriefData>
  research: Record<string, ResearchData>
  marketEvidence: Record<string, MarketEvidenceData>
  setProductSeed: (id: string, seed: ProductSeedData) => void
  setBrief: (id: string, brief: BriefData) => void
  setResearch: (id: string, research: ResearchData) => void
  confirmDirection: (parentId: string, direction: ProductDirection) => void
  setMarketEvidence: (id: string, evidence: MarketEvidenceData) => void
}

export const useProcessStore = create<ProcessState>((set) => ({
  productSeeds: {}, briefs: {}, research: {}, marketEvidence: {},
  setProductSeed: (id, seed) => set((state) => ({ productSeeds: { ...state.productSeeds, [id]: { ...seed, confirmedDirection: state.productSeeds[id]?.confirmedDirection } } })),
  setBrief: (id, brief) => set((state) => ({ briefs: { ...state.briefs, [id]: brief } })),
  setResearch: (id, research) => set((state) => ({ research: { ...state.research, [id]: research } })),
  confirmDirection: (parentId, direction) => set((state) => {
    const confirmed = { ...direction, confirmedAt: new Date().toISOString() }
    const seed = state.productSeeds[parentId]
    return {
      productSeeds: seed ? { ...state.productSeeds, [parentId]: { ...seed, confirmedDirection: confirmed } } : state.productSeeds,
      marketEvidence: { ...state.marketEvidence, [`market-evidence-${parentId}`]: { parentId, direction: confirmed, status: "running" } },
    }
  }),
  setMarketEvidence: (id, evidence) => set((state) => ({ marketEvidence: { ...state.marketEvidence, [id]: evidence } })),
}))
