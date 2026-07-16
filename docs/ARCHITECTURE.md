# Lovart architecture

The project follows a modular monolith. Next.js remains the deployment unit, while business capabilities are isolated by feature so they can evolve without turning `app/` or `lib/` into catch-all directories.

## Dependency direction

```text
app pages / components
        |
        v
app/actions and app/api adapters
        |
        v
features/<feature>/server services
        |
        v
lib domain helpers and infrastructure
        |
        v
PostgreSQL and external providers
```

Dependencies only point downward. In particular:

- `app/` owns Next.js routing, metadata, Route Handlers, and Server Action adapters.
- `features/` owns capability-specific contracts, client hooks, and server orchestration.
- `components/` owns shared or page-level presentation. It may call Server Actions but must not query the database.
- `lib/` owns reusable domain logic and infrastructure. It must not import `app/` or `components/`.
- `skills/` is an independent agent skill package and keeps its own tests and schemas.

## Feature layout

Use only the folders a feature needs:

```text
features/<feature>/
  contracts.ts        # Serializable input/output contracts and schemas
  client/             # Hooks and browser-only state
  server/             # Application services and repositories
```

Current feature boundaries:

- `studio`: project state machine, artifact generation, review, revision, and publication flow.
- `explore`: public project discovery, sharing, and likes.
- `campaign`: published campaign reads and validation signals.
- `canvas`: project and anonymous canvas persistence behind a server service.

New database-backed behavior belongs in a feature server service. Keep `app/actions/*` limited to parsing untrusted input, invoking the service, and triggering framework concerns such as cache revalidation.

## Configuration and database

All server environment variables are parsed in `lib/config/server.ts`. Do not read `process.env` in business modules or Route Handlers.

PostgreSQL pools are registered globally by connection string in `lib/db/pool.ts`. This prevents a new pool on every development hot reload and lets Drizzle and raw canvas queries share a connection when they use the same database URL.

`DATABASE_URL` is the primary application connection. `ALIYUN_RDS_DATABASE_URL` remains a compatible canvas override; either value can act as the fallback for local or single-database deployments.

Schema changes are append-only SQL files under `db/migrations` and are applied with `pnpm db:migrate`. Runtime code must not execute DDL. Operational details are documented in `docs/DATABASE.md`.

## Quality gate

Run the complete local gate before merging:

```bash
pnpm check
```

The contract checks validate transport defaults, migration ordering, and input limits. The architecture check rejects reverse dependencies, direct database access from adapters, API-to-Server-Action coupling, scattered environment access, runtime DDL, and new source files over the 700-line hard limit. Two actively evolving legacy services have explicit temporary budgets in the check script; reduce those budgets as their repositories and use cases are extracted. Extend `scripts/check-architecture.mjs` whenever a new architectural rule becomes important enough to automate.

## Adding a feature

1. Define serializable schemas and public types in `features/<feature>/contracts.ts`.
2. Put business orchestration in `features/<feature>/server` and keep it independent of UI modules.
3. Expose browser mutations through a thin `app/actions/<feature>.ts` adapter.
4. Put feature-specific hooks under `features/<feature>/client`.
5. Add focused tests for pure rules and one integration contract for database behavior with meaningful risk.
