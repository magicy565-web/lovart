import "server-only"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { serverEnv } from "@/lib/config/server"
import { db } from "@/lib/db"
import { account, rateLimit, session, user, verification } from "@/lib/db/schema"

const baseURL = serverEnv.BETTER_AUTH_URL ?? {
  allowedHosts: ["localhost:*", "127.0.0.1:*"],
  protocol: serverEnv.NODE_ENV === "production" ? "https" as const : "http" as const,
}

export const auth = betterAuth({
  appName: "启物",
  baseURL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: serverEnv.BETTER_AUTH_URL ? [new URL(serverEnv.BETTER_AUTH_URL).origin] : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
})
