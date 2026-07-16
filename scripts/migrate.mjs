import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

import pg from "pg"

const { Client } = pg
const root = resolve(import.meta.dirname, "..")
const migrationsDirectory = resolve(root, "db", "migrations")
const statusOnly = process.argv.includes("--status")

if (existsSync(resolve(root, ".env.local")) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(resolve(root, ".env.local"))
}

function databaseUrl() {
  const raw = process.env.DATABASE_URL?.trim() || process.env.ALIYUN_RDS_DATABASE_URL?.trim()
  if (!raw) throw new Error("Set DATABASE_URL or ALIYUN_RDS_DATABASE_URL before running migrations")
  return /^postgres(ql)?:\/\//i.test(raw) ? raw : raw.includes("@") ? `postgresql://${raw}` : raw
}

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex")
}

function migrationFiles() {
  return readdirSync(migrationsDirectory)
    .filter((file) => /^\d{3}-[a-z0-9-]+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right))
}

const connectionString = databaseUrl()
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
const client = new Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
})

await client.connect()

try {
  await client.query("SET search_path TO public")
  const files = migrationFiles()
  const tableExists = await client.query("SELECT to_regclass('public.lovart_schema_migrations') AS name")
  let applied = new Map()

  if (tableExists.rows[0]?.name) {
    const result = await client.query("SELECT id, checksum FROM lovart_schema_migrations ORDER BY id")
    applied = new Map(result.rows.map((row) => [row.id, row.checksum]))
  }

  if (statusOnly) {
    let modified = false
    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDirectory, file), "utf8")
      const savedChecksum = applied.get(file)
      const state = !savedChecksum ? "pending" : savedChecksum === checksum(sql) ? "applied" : "modified"
      if (state === "modified") modified = true
      console.log(`${state.padEnd(8)} ${file}`)
    }
    if (modified) process.exitCode = 1
  } else {
    await client.query("SELECT pg_advisory_lock(hashtext('lovart_schema_migrations'))")
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS lovart_schema_migrations (
          id text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      const result = await client.query("SELECT id, checksum FROM lovart_schema_migrations ORDER BY id")
      applied = new Map(result.rows.map((row) => [row.id, row.checksum]))

      for (const file of files) {
        const sql = readFileSync(resolve(migrationsDirectory, file), "utf8")
        const nextChecksum = checksum(sql)
        const savedChecksum = applied.get(file)
        if (savedChecksum && savedChecksum !== nextChecksum) {
          throw new Error(`Applied migration changed: ${file}`)
        }
        if (savedChecksum) {
          console.log(`skip     ${file}`)
          continue
        }

        await client.query("BEGIN")
        try {
          await client.query(sql)
          await client.query(
            "INSERT INTO lovart_schema_migrations (id, checksum) VALUES ($1, $2)",
            [file, nextChecksum],
          )
          await client.query("COMMIT")
          console.log(`applied  ${file}`)
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        }
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('lovart_schema_migrations'))")
    }
  }
} finally {
  await client.end()
}
