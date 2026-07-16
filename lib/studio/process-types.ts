export type { BriefData } from "@/lib/artifacts/product-brief-artifact"
export type ResearchData = { topic: string; summary: string; marketSize: string; competitors: { name: string; price: string; note: string }[]; trends: string[]; opportunity: string; sources: { title: string; url: string }[] }
export type ProductDirection = { title: string; description: string; confirmedAt?: string }
export type ProductSeedData = { product: string; user: string; scenario: string; problem: string; directions: [ProductDirection, ProductDirection]; confirmedDirection?: ProductDirection }
export type MarketEvidenceData = { parentId: string; direction: ProductDirection; status: "running" | "done" | "error"; research?: ResearchData; error?: string }
