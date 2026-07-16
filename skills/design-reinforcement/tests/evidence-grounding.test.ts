import assert from "node:assert/strict"
import test from "node:test"

import {
  cleanCreativeEvidence,
  evidencePerformanceScore,
  evidenceSignalGaps,
} from "../../../lib/design-reinforcement/evidence"
import { tiktokBundleFixture } from "./fixtures/tiktok-bundle"

test("deduplicates canonical source URLs and retains rejection reasons", () => {
  const result = cleanCreativeEvidence(tiktokBundleFixture)
  assert.deepEqual(result.accepted.map((item) => item.evidence_id), ["ev_alpha", "ev_beta", "ev_gamma"])
  assert.deepEqual(result.rejected, [{ evidence_id: "ev_duplicate", reason: "重复或无效的来源 URL" }])
  assert.equal(result.clusters.length, 3)
})

test("commercial proxy signals never become full video-performance scores", () => {
  const commercialOnly = tiktokBundleFixture.evidence[0]
  const videoEvidence = tiktokBundleFixture.evidence[2]
  assert.ok(evidencePerformanceScore(commercialOnly) <= 70)
  assert.ok(evidencePerformanceScore(videoEvidence) > evidencePerformanceScore(commercialOnly))
})

test("reports missing video and time signals as unresolved gaps", () => {
  const cleaned = cleanCreativeEvidence(tiktokBundleFixture)
  const gaps = evidenceSignalGaps(cleaned.accepted)
  assert.ok(gaps.some((gap) => gap.includes("视频或抽帧")))
  assert.ok(gaps.some((gap) => gap.includes("发布时间")))
})
