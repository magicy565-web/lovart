import "server-only"

import { z } from "zod"

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
)

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().optional(),
)

const stringWithDefault = (fallback: string) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).default(fallback),
)

const urlWithDefault = (fallback: string) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().default(fallback),
)

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalString,
  ALIYUN_RDS_DATABASE_URL: optionalString,
  BETTER_AUTH_SECRET: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  BETTER_AUTH_URL: optionalUrl,
  MIMO_BASE_URL: urlWithDefault("https://api.xiaomimimo.com/v1"),
  MIMO_API_KEY: optionalString,
  MIMO_VISION_MODEL: stringWithDefault("mimo-v2.5"),
  MIMO_DESIGN_MODEL: stringWithDefault("mimo-v2.5-pro"),
  MIMO_REVIEW_MODEL: stringWithDefault("mimo-v2.5"),
  PARALLEL_BASE_URL: urlWithDefault("https://api.parallel.ai"),
  PARALLEL_API_KEY: optionalString,
  KUAIPAO_BASE_URL: urlWithDefault("https://kuaipao.ai/v1"),
  KUAIPAO_API_KEY: optionalString,
  APIFY_API_TOKEN: optionalString,
  APIFY_API_BASE_URL: urlWithDefault("https://api.apify.com/v2"),
  APIFY_TIKTOK_SHOP_ACTOR_ID: stringWithDefault("pro100chok/tiktok-shop-scraper-usage"),
})

const parsed = serverEnvSchema.safeParse(process.env)

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ")
  throw new Error(`服务端环境变量配置无效: ${detail}`)
}

export const serverEnv = Object.freeze(parsed.data)

function normalizePostgresUrl(raw: string, variableName: string) {
  const candidate = /^postgres(ql)?:\/\//i.test(raw)
    ? raw
    : raw.includes("@")
      ? `postgresql://${raw}`
      : raw

  try {
    const url = new URL(candidate)
    if (!/^postgres(ql)?:$/.test(url.protocol) || !url.hostname) throw new Error("协议或主机名无效")
    return candidate
  } catch (error) {
    const reason = error instanceof Error ? error.message : "格式无效"
    throw new Error(`${variableName} 必须是有效的 PostgreSQL 连接串: ${reason}`)
  }
}

function requireDatabaseUrl(primary: string | undefined, fallback: string | undefined, variableName: string) {
  const raw = primary ?? fallback
  if (!raw) throw new Error(`缺少数据库连接配置，请设置 ${variableName}`)
  return normalizePostgresUrl(raw, variableName)
}

export function getApplicationDatabaseUrl() {
  return requireDatabaseUrl(
    serverEnv.DATABASE_URL,
    serverEnv.ALIYUN_RDS_DATABASE_URL,
    "DATABASE_URL（或 ALIYUN_RDS_DATABASE_URL）",
  )
}

export function getCanvasDatabaseUrl() {
  return requireDatabaseUrl(
    serverEnv.ALIYUN_RDS_DATABASE_URL,
    serverEnv.DATABASE_URL,
    "ALIYUN_RDS_DATABASE_URL（或 DATABASE_URL）",
  )
}

export function requireServerSecret(value: string | undefined, variableName: string) {
  if (!value) throw new Error(`尚未配置 ${variableName}`)
  return value
}
