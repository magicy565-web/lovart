import type { CompetitiveCreativeBundle } from "../../../../lib/artifacts/design-reinforcement-artifact"

const collectedAt = "2026-07-15T12:00:00.000Z"

export const tiktokBundleFixture: CompetitiveCreativeBundle = {
  bundle_id: "bundle_fixture",
  platform: "tiktok",
  actor_run_id: "run_fixture",
  dataset_id: "dataset_fixture",
  created_at: collectedAt,
  warnings: [],
  evidence: [
    {
      evidence_id: "ev_alpha",
      competitor_name: "Alpha Shop",
      source_url: "https://www.tiktok.com/view/product/alpha?utm_source=test",
      platform: "tiktok",
      title: "Alpha portable lamp",
      media: { image_urls: ["https://cdn.example.com/alpha.jpg"], cover_image: "https://cdn.example.com/alpha.jpg" },
      commercial_signals: { price: 29, sold_count: 12000, review_count: 800, rating: 4.7 },
      collection_context: { search_query: "portable lamp", collected_at: collectedAt, actor_run_id: "run_fixture", dataset_id: "dataset_fixture" },
    },
    {
      evidence_id: "ev_beta",
      competitor_name: "Beta Store",
      source_url: "https://www.tiktok.com/view/product/beta",
      platform: "tiktok",
      title: "Beta travel light",
      media: { image_urls: ["https://cdn.example.com/beta.jpg"], cover_image: "https://cdn.example.com/beta.jpg" },
      commercial_signals: { price: 35, sold_count: 8000, review_count: 410, rating: 4.5 },
      collection_context: { search_query: "portable lamp", collected_at: collectedAt, actor_run_id: "run_fixture", dataset_id: "dataset_fixture" },
    },
    {
      evidence_id: "ev_gamma",
      competitor_name: "Gamma Goods",
      source_url: "https://www.tiktok.com/view/product/gamma",
      platform: "tiktok",
      title: "Gamma compact light",
      media: { image_urls: ["https://cdn.example.com/gamma.jpg"], cover_image: "https://cdn.example.com/gamma.jpg" },
      performance_signals: { views: 540000, likes: 42000, comments: 820, shares: 1900, posted_at: "2026-06-20T12:00:00.000Z" },
      commercial_signals: { price: 39, sold_count: 5000, review_count: 320, rating: 4.6 },
      collection_context: { search_query: "portable lamp", collected_at: collectedAt, actor_run_id: "run_fixture", dataset_id: "dataset_fixture" },
    },
    {
      evidence_id: "ev_duplicate",
      competitor_name: "Alpha Shop",
      source_url: "https://www.tiktok.com/view/product/alpha?ref=duplicate",
      platform: "tiktok",
      title: "Duplicate Alpha listing",
      media: { image_urls: ["https://cdn.example.com/alpha-copy.jpg"] },
      collection_context: { search_query: "portable lamp", collected_at: collectedAt, actor_run_id: "run_fixture", dataset_id: "dataset_fixture" },
    },
  ],
}
