# Design reinforcement contracts

## Product Brief gate

Only accept a Brief snapshot whose `status` is `confirmed` and which includes a stable `product_id`, positive `version`, `confirmed_at`, and `confirmed_hash`. These values are provenance, not fields the design skill may infer. Editing a confirmed Brief creates a new draft version and invalidates downstream artifacts from the previous version.

## Evidence semantics

`CompetitiveCreativeEvidence` is one traceable market record. Its `source_url`, `evidence_id`, media, and collection context are factual provenance. Signal fields are optional; missing fields remain missing.

- `performance_signals`: views, likes, comments, shares, and post time for the observed creative.
- `commercial_signals`: product price, sold count, reviews, and rating. These can support commercial relevance but cannot prove a video hook worked.
- `collection_context`: the exact query, collection timestamp, Apify Actor run ID, and Dataset ID.

Reject a record when its source is duplicated, no usable media remains, or per-competitor/run limits are exceeded. Preserve each rejection and reason.

## Observation semantics

An observation reports one visible feature:

```json
{
  "feature": "product_scale",
  "value": "The product occupies about 60% of the frame",
  "confidence": 0.88,
  "supporting_evidence_ids": ["ev_a"],
  "interpretation": "The product remains legible in a mobile feed thumbnail"
}
```

Do not infer time-based video properties from a still image. Do not infer text meaning when text is unreadable.

## Pattern semantics

Patterns aggregate observations across evidence. The program calculates prevalence, performance, freshness, and the final weighted score; the model supplies product-fit, feasibility, rationale, and evidence selection.

- `category_rule`: necessary category comprehension rule.
- `growth_pattern`: repeated structure worth adapting.
- `saturated_pattern`: repeated expression that now requires differentiation.
- `opportunity_pattern`: underused, evidence-supported experiment.
- `avoid`: low fit, weak evidence, or copying risk.

## Stability

Use stable IDs derived from source content, low model temperatures, fixed schemas, deterministic score calculation, and strict normalization. Repeated runs may vary in prose but should preserve the same dominant evidence, pattern classes, and three strategies.
