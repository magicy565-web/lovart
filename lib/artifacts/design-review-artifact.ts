export type DesignReviewScores = {
  styleAlignment: number
  productClarity: number
  originality: number
  salesImpact: number
}

export type DesignReviewResult = {
  totalScore: number
  scores: DesignReviewScores
  summary: string
  strengths: string[]
  issues: string[]
  revisedPrompt: string
  reviewedAt: string
}
