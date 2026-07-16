import "server-only"

import { drizzle } from "drizzle-orm/node-postgres"

import { getApplicationDatabaseUrl } from "@/lib/config/server"
import { getPostgresPool } from "@/lib/db/pool"
import * as schema from "./schema"

export const pool = getPostgresPool(getApplicationDatabaseUrl())
export const db = drizzle(pool, { schema })
