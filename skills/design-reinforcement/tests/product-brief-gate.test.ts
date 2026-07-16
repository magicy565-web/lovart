import assert from "node:assert/strict"
import test from "node:test"

import type { BriefData } from "../../../lib/artifacts/product-brief-artifact"
import { assertConfirmedProductBrief } from "../../../lib/design-reinforcement/brief-gate"
import { confirmProductBrief, reviseProductBrief } from "../../../lib/product/brief-lifecycle"

const draft: BriefData = {
  productId: "product_test",
  status: "draft",
  version: 1,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
  productName: "便携美甲灯",
  tagline: "随时完成专业固化",
  audience: "需要移动美甲服务的从业者",
  form: "折叠式铝合金灯体",
  painPoints: ["设备笨重"],
  sellingPoints: ["可折叠"],
  retailPrice: 399,
  earlyBirdPrice: 299,
  risks: ["续航验证"],
  tasks: [{ title: "产品定义", note: "确认结构" }],
}

test("confirmation preserves product identity and creates traceable provenance", () => {
  const confirmed = confirmProductBrief(draft, "2026-07-15T01:00:00.000Z")
  assert.equal(confirmed.status, "confirmed")
  assert.equal(confirmed.productId, draft.productId)
  assert.equal(confirmed.version, 1)
  assert.equal(confirmed.confirmedAt, "2026-07-15T01:00:00.000Z")
  assert.match(confirmed.confirmedHash || "", /^brief_[0-9a-f]{8}$/)
})

test("editing a confirmed brief increments the version and invalidates confirmation", () => {
  const confirmed = confirmProductBrief(draft, "2026-07-15T01:00:00.000Z")
  const revised = reviseProductBrief(
    confirmed,
    { ...confirmed, retailPrice: 429 },
    "2026-07-15T02:00:00.000Z",
  )
  assert.equal(revised.status, "draft")
  assert.equal(revised.version, 2)
  assert.equal(revised.productId, confirmed.productId)
  assert.equal(revised.confirmedAt, undefined)
  assert.equal(revised.confirmedHash, undefined)
})

test("design reinforcement rejects an unconfirmed brief before evidence processing", () => {
  assert.throws(
    () => assertConfirmedProductBrief({ status: "draft" } as never),
    /只接受已确认且可追溯的 Product Brief/,
  )
})
