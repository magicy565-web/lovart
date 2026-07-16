import type { ConfirmedProductBriefInput } from "@/lib/artifacts/design-reinforcement-artifact"

export function assertConfirmedProductBrief(brief: Partial<ConfirmedProductBriefInput> | undefined): asserts brief is ConfirmedProductBriefInput {
  if (brief?.status !== "confirmed" || !brief.confirmed_at || !brief.confirmed_hash || !brief.version || !brief.product_id) {
    throw new Error("设计强化只接受已确认且可追溯的 Product Brief")
  }
}
