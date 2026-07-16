---
name: design-reinforcement
description: Compile real competitor research evidence into traceable visual patterns, Visual DNA, and three original design directions. Use when a confirmed product brief and TikTok/market evidence must guide landing pages, product images, TikTok creatives, crowdfunding pages, brand systems, or influencer kits; also use to audit a produced design against that evidence. Do not use for competitor discovery, scraping, direct image generation, or copying a named brand or creator style.
---

# Design Reinforcement

Act as the compiler between research evidence and production agents. Convert what the market contains into evidence-grounded rules for what to adopt, adapt, test, or avoid. Never act as a general design agent.

## Required inputs

Require all three objects before synthesis:

1. A confirmed product brief with stable `product_id`, positive `version`, `status = confirmed`, `confirmed_at`, `confirmed_hash`, product identity, audience, form, pain points, and selling points. Reject drafts and inferred confirmation state.
2. A research artifact with the research question and design goal.
3. A competitive creative bundle containing 3–5 competitors, stable `evidence_id` values, media, source URLs, collection context, and available performance/commercial signals.

Read [references/contracts.md](references/contracts.md) for field semantics and evidence rules. Validate payloads against the JSON Schemas in `schemas/` when accepting external input.

## V1 workflow

Execute these stages in order:

1. Validate the Product Brief confirmation gate. Never scrape or synthesize from a draft; if a confirmed brief is edited, require its new version to be reconfirmed.
2. Normalize Apify Dataset records into `CompetitiveCreativeBundle`; preserve the real Actor run and Dataset IDs.
3. Deduplicate sources and media, cap analysis at 20 core evidence records, and retain rejection reasons.
4. Extract fixed-dimension visual observations. Attach valid supporting evidence IDs to every observation.
5. Synthesize `VisualPatternLibrary`. Compute market-performance, prevalence, product-fit, freshness, and feasibility separately.
6. Divide conclusions into category rules, growth patterns, saturated patterns, opportunities, and avoid patterns.
7. Generate exactly three directions: `validated`, `differentiated`, and `experimental`.
8. Stop at `DesignReinforcementArtifact.stage = directions_ready`. Do not call image, Figma, HTML, or video production in V1.

Use the prompt contracts in `prompts/` when replacing or reviewing model calls. Keep observation, pattern synthesis, and creative direction as separate calls so evidence loss can be localized.

## Evidence integrity

- Reject conclusions without supporting evidence IDs.
- Never treat appearance frequency as effectiveness.
- Never treat views as product fit.
- Never treat product sales or reviews as video-performance metrics; label them commercial proxy signals.
- Record missing video, frames, engagement, or timestamps in `unresolved_gaps` instead of inferring them.
- Require at least two evidence records for repeated category, growth, or saturated patterns when three or more competitors are available.
- Calculate Pattern Score as 30% performance, 25% prevalence, 20% product fit, 15% freshness, and 10% feasibility.

## Originality boundary

Learn information hierarchy, composition, product scale, contrast, camera language, content rhythm, proof placement, emotion, CTA structure, and category conventions.

Do not learn or request specific logos, packaging artwork, characters, proprietary illustrations, one-to-one layouts, patented forms, or a single creator's personal style. Convert saturated conventions into differentiation constraints rather than production instructions.

## Direction contract

- `validated`: minimize comprehension cost with proven category rules; state similarity risk.
- `differentiated`: retain effective information structure while changing saturated visual language; state conversion risk.
- `experimental`: propose a bounded A/B-testable opportunity; state uncertainty.

Each direction must cite both `reference_evidence_ids` and `source_pattern_ids`, and must provide executable layout, image, copy, and motion rules. Do not output a long image-generation prompt.

## Production and critique

Only after the user confirms a direction may a later asset-brief compiler route work to image generation, Figma, HTML, or video agents. When evaluating a produced design, use the saved Artifact as the rubric and allow at most two automated revision rounds before human confirmation.
