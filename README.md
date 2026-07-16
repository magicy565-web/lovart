# Lovart

Lovart is a Next.js modular monolith for turning a product idea into a reviewed crowdfunding campaign, visual system, validation plan, and publishable release package.

## Getting started

Requirements: Node.js 20+, pnpm 11, and PostgreSQL.

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and the provider keys needed by the workflows you want to run. Authentication uses the MIT-licensed Better Auth framework and stores users, linked accounts, sessions, verification tokens, and distributed rate limits in PostgreSQL.

## Project structure

```text
app/          Next.js routes and transport adapters
features/     Studio, Explore, and Campaign capability modules
components/   Shared and page-level UI
lib/          Reusable domain logic and infrastructure
skills/       Design reinforcement agent skill package
db/           Append-only PostgreSQL migrations
scripts/      Quality gates, contract checks, and migration tooling
docs/         Architecture and operating documentation
```

The dependency rules and feature extension workflow are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Database deployment and recovery practices are in [`docs/DATABASE.md`](docs/DATABASE.md).

## Development commands

```bash
pnpm dev
pnpm db:migrate:status
pnpm db:migrate
pnpm typecheck
pnpm lint
pnpm check
```

## TikTok design reinforcement V1

The studio's `buildDesignReinforcement` tool compiles TikTok-only market evidence into design directions:

1. `pro100chok/tiktok-shop-scraper-usage` runs asynchronously with `maxTotalChargeUsd=0.03`, preserving the real Actor run and Dataset IDs.
2. Dataset records are normalized into `CompetitiveCreativeBundle` entries with stable `evidence_id` values, media, collection context, and available commercial/performance signals.
3. Deterministic cleaning removes duplicate sources and media, caps deep analysis at 20 records, and retains every rejection reason.
4. MiMo Vision extracts fixed-dimension visual observations. Every observation must cite its supporting evidence IDs; missing video, engagement, or time fields remain explicit evidence gaps.
5. The compiler builds a scored `VisualPatternLibrary`, separating category rules, growth patterns, saturated conventions, opportunities, and avoid patterns.
6. Three traceable directions are created: market-validated, brand-differentiated, and experimental. V1 stops at `directions_ready` and does not call image, Figma, HTML, or video production.

Copy `.env.example` to `.env.local`, create a fresh token in Apify Console under **Settings → Integrations**, and set `APIFY_API_TOKEN`. Keep Apify and model keys server-side and never commit them to Git.

The $0.03 guard applies to the Apify Actor run only. MiMo feature extraction and pattern/direction synthesis are separately billed. Product sales and reviews are treated only as commercial proxy signals when video views, likes, comments, shares, or timestamps are unavailable.

## Campaign Foundation decision room

The crowdfunding pipeline now uses seven ordered nodes:

```text
Product Brief -> Research -> Campaign Foundation -> Visual System -> Campaign -> Validation -> Release Package
```

`Campaign Foundation` generates three candidate routes, supports hybrid instructions such as combining route A utility with route B visual language, and locks six decisions before downstream generation: launch scope, primary audience, campaign story, offer, evidence plan, and delivery readiness.

Readiness is evaluated as `go`, `conditional_go`, or `blocked`. Conditional projects can publish only an explicit concept-validation page with non-binding, not-charged reservations. Live mode requires physical or verified evidence, a functional prototype or production sample, supplier progress, and a real cost range.

Run the contract check with:

```bash
pnpm test:foundation
```

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
