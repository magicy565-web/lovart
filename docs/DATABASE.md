# Database operations

Lovart uses append-only SQL migrations in `db/migrations`. Application requests never create or alter tables.

## Local setup

Configure `DATABASE_URL` in `.env.local`, then run:

```bash
pnpm db:migrate:status
pnpm db:migrate
```

The migrator loads `.env.local`, takes a PostgreSQL advisory lock, and applies each pending migration in its own transaction. Applied filenames and SHA-256 checksums are recorded in `lovart_schema_migrations`.

## Migration rules

- Never edit a migration after it has been applied to a shared environment.
- Add the next contiguous numeric file, for example `007-project-ownership.sql`.
- Make forward migrations idempotent where practical.
- Use a new forward migration to repair or reverse a change; do not rely on automatic down migrations.
- Keep schema DDL out of Route Handlers, Server Actions, and feature services.

`pnpm db:migrate:status` reports `modified` and exits unsuccessfully when an applied file no longer matches its recorded checksum.

## Legacy databases

Migration `000` moves known tables from the early `lovart` schema into `public` only when the public table does not already exist. If both copies exist it emits a warning and leaves both untouched so data can be reconciled deliberately.

Migration `002` also protects generic pre-existing `tasks` and `validation_signals` tables by renaming incompatible versions to `legacy_tasks` and `legacy_validation_signals` before Lovart creates its own tables.

## Integrity rollout

Migration `005` adds foreign keys and checks as `NOT VALID`. PostgreSQL enforces them for new writes without requiring all historical rows to be clean first.

After auditing old data, validate constraints in a later migration:

```sql
ALTER TABLE tasks VALIDATE CONSTRAINT lovart_tasks_project_fk;
```

Validate one constraint at a time in production and monitor lock duration.

## Deployment order

1. Back up the database or confirm point-in-time recovery.
2. Run `pnpm db:migrate:status`.
3. Run `pnpm db:migrate` from one release job.
4. Deploy the application build.
5. Run smoke checks for authentication, Studio canvas persistence, publication, and reservations.
