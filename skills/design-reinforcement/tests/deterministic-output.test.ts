import assert from "node:assert/strict"
import test from "node:test"

import { cleanCreativeEvidence } from "../../../lib/design-reinforcement/evidence"
import { tiktokBundleFixture } from "./fixtures/tiktok-bundle"

test("evidence cleaning is deterministic for identical input", () => {
  const first = cleanCreativeEvidence(structuredClone(tiktokBundleFixture))
  const second = cleanCreativeEvidence(structuredClone(tiktokBundleFixture))
  assert.deepEqual(first, second)
})
