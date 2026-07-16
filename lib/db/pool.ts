import "server-only"

import { Pool, type PoolConfig } from "pg"

type PoolRegistry = Map<string, Pool>

const globalForPostgres = globalThis as unknown as { postgresPools?: PoolRegistry }
const pools = globalForPostgres.postgresPools ?? new Map<string, Pool>()

globalForPostgres.postgresPools = pools

function usesLocalTls(connectionString: string) {
  return /localhost|127\.0\.0\.1/.test(connectionString)
}

function withPublicSchema(connectionString: string) {
  const url = new URL(connectionString)
  url.searchParams.set("options", "-c search_path=public")
  return url.toString()
}

export function getPostgresPool(connectionString: string, options: Omit<PoolConfig, "connectionString" | "ssl"> = {}) {
  const normalizedConnectionString = withPublicSchema(connectionString)
  const existing = pools.get(normalizedConnectionString)
  if (existing) return existing

  const pool = new Pool({
    connectionString: normalizedConnectionString,
    ssl: usesLocalTls(normalizedConnectionString) ? undefined : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...options,
  })
  pools.set(normalizedConnectionString, pool)
  return pool
}
