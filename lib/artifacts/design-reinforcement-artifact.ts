export type DesignTargetAsset =
  | "landing_page"
  | "kickstarter_page"
  | "product_images"
  | "tiktok_creatives"
  | "brand_identity"
  | "influencer_kit"

export type ConfirmedProductBriefInput = {
  product_id: string
  status: "confirmed"
  version: number
  confirmed_at: string
  confirmed_hash: string
  product_name: string
  audience: string
  product_form: string
  pain_points: string[]
  selling_points: string[]
  target_price?: number
}

export type ResearchArtifactInput = {
  research_id: string
  topic: string
  query: string
  design_goal: string
  hypotheses: string[]
  created_at: string
}

export type CompetitiveCreativeEvidence = {
  evidence_id: string
  competitor_name: string
  source_url: string
  platform: "tiktok"
  title: string
  description?: string
  media: {
    video_url?: string
    image_urls: string[]
    cover_image?: string
    sampled_frames?: string[]
  }
  performance_signals?: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
    posted_at?: string
  }
  commercial_signals?: {
    price?: number
    price_label?: string
    discount?: string
    cta?: string
    sold_count?: number
    review_count?: number
    rating?: number
  }
  collection_context: {
    search_query: string
    collected_at: string
    actor_run_id: string
    dataset_id: string
  }
}

export type CompetitiveCreativeBundle = {
  bundle_id: string
  platform: "tiktok"
  evidence: CompetitiveCreativeEvidence[]
  actor_run_id: string
  dataset_id: string
  created_at: string
  warnings: string[]
}

export type DesignReinforcementInput = {
  product_brief: ConfirmedProductBriefInput
  research_artifact: ResearchArtifactInput
  creative_evidence: CompetitiveCreativeBundle
  target_assets: DesignTargetAsset[]
  constraints?: {
    markets?: string[]
    platforms?: string[]
    brand_maturity?: "new" | "existing"
    production_budget?: "low" | "medium" | "high"
    forbidden_styles?: string[]
  }
}

export type CreativeCluster = {
  cluster_id: string
  label: string
  basis: "competitor" | "source-duplicate" | "visual-similarity"
  evidence_ids: string[]
}

export type CleanCreativeEvidence = {
  accepted: CompetitiveCreativeEvidence[]
  rejected: Array<{ evidence_id: string; reason: string }>
  clusters: CreativeCluster[]
}

export type VisualFeatureObservation = {
  feature: string
  value: string
  confidence: number
  supporting_evidence_ids: string[]
  interpretation: string
}

export type VisualPatternRecommendation = "adopt" | "adapt" | "experiment" | "avoid"
export type VisualPatternKind = "category_rule" | "growth_pattern" | "saturated_pattern" | "opportunity_pattern" | "avoid"

export type VisualPattern = {
  pattern_id: string
  kind: VisualPatternKind
  name: string
  description: string
  applies_to: DesignTargetAsset[]
  evidence_ids: string[]
  prevalence_score: number
  performance_score: number
  product_fit_score: number
  freshness_score: number
  feasibility_score: number
  pattern_score: number
  use_recommendation: VisualPatternRecommendation
  rationale: string
}

export type DesignDirectionStrategy = "validated" | "differentiated" | "experimental"

export type DesignDirection = {
  direction_id: string
  name: string
  strategy: DesignDirectionStrategy
  core_idea: string
  target_emotion: string
  visual_keywords: string[]
  reference_evidence_ids: string[]
  source_pattern_ids: string[]
  layout_rules: string[]
  image_rules: string[]
  copy_rules: string[]
  motion_rules: string[]
  differentiation_statement: string
  risks: string[]
}

export type DesignReinforcementArtifact = {
  version: 1
  stage: "directions_ready"
  artifact_id: string
  product_id: string
  topic: string
  created_at: string
  product_brief: ConfirmedProductBriefInput
  research_artifact: ResearchArtifactInput
  creative_evidence: CompetitiveCreativeBundle
  evidence_cleaning: {
    accepted_count: number
    rejected: Array<{ evidence_id: string; reason: string }>
    clusters: CreativeCluster[]
  }
  visual_features: VisualFeatureObservation[]
  pattern_library: VisualPattern[]
  market_visual_summary: {
    dominant_patterns: VisualPattern[]
    saturated_patterns: VisualPattern[]
    opportunity_patterns: VisualPattern[]
  }
  visual_dna: {
    brand_personality: string[]
    composition_rules: string[]
    typography_rules: string[]
    color_strategy: string[]
    imagery_rules: string[]
    motion_rules: string[]
    forbidden_patterns: string[]
  }
  design_directions: DesignDirection[]
  target_assets: DesignTargetAsset[]
  evidence_trace: {
    evidence_ids: string[]
    assumptions: string[]
    unresolved_gaps: string[]
  }
  budget: { max_usd: number; estimated_actor_usd: number }
  warnings: string[]
}
