import "server-only"

import { getCanvasDatabaseUrl } from "@/lib/config/server"
import { getPostgresPool } from "@/lib/db/pool"

export function getRds() {
  return getPostgresPool(getCanvasDatabaseUrl())
}
