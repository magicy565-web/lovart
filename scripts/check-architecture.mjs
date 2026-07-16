import { readFileSync, readdirSync, statSync } from "node:fs"
import { relative, resolve, sep } from "node:path"

const root = resolve(import.meta.dirname, "..")
const sourceRoots = ["app", "components", "features", "lib"]
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"])
const violations = []

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (sourceExtensions.has(path.slice(path.lastIndexOf(".")))) files.push(path)
  }
  return files
}

function report(file, rule, detail) {
  violations.push(`${file}: ${rule} - ${detail}`)
}

for (const sourceRoot of sourceRoots) {
  const directory = resolve(root, sourceRoot)
  for (const absolutePath of walk(directory)) {
    const file = relative(root, absolutePath).split(sep).join("/")
    const source = readFileSync(absolutePath, "utf8")
    const lineCount = source.split(/\r?\n/).length
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1])

    if (file.startsWith("lib/")) {
      for (const specifier of imports) {
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          report(file, "shared-layer-direction", `lib cannot depend on ${specifier}`)
        }
      }
    }

    if (/^features\/[^/]+\/server\//.test(file)) {
      for (const specifier of imports) {
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          report(file, "server-feature-direction", `server features cannot depend on ${specifier}`)
        }
      }
    }

    if (file.startsWith("features/") && !/^features\/[^/]+\/server\//.test(file)) {
      for (const specifier of imports) {
        if (specifier === "@/lib/db" || specifier.startsWith("@/lib/db/") || specifier === "@/lib/rds") {
          report(file, "database-boundary", `only feature server modules may import ${specifier}`)
        }
      }
    }

    if (file.startsWith("app/api/")) {
      for (const specifier of imports) {
        if (specifier.startsWith("@/app/actions")) {
          report(file, "api-action-coupling", `API routes must call feature services, not ${specifier}`)
        }
        if (specifier === "@/lib/db" || specifier.startsWith("@/lib/db/") || specifier === "@/lib/rds") {
          report(file, "thin-route", `API routes must delegate database work instead of importing ${specifier}`)
        }
      }
    }

    if (file.startsWith("app/actions/")) {
      const importsDatabase = imports.some(
        (specifier) => specifier === "@/lib/db" || specifier.startsWith("@/lib/db/") || specifier === "@/lib/rds",
      )
      if (importsDatabase) report(file, "thin-action", "Server Actions must delegate database work to a feature service")
      if (!imports.some((specifier) => specifier.includes("/features/"))) {
        report(file, "thin-action", "Server Actions must delegate to a feature module")
      }
    }

    const mayReadEnvironment = file === "lib/config/server.ts" || file === "app/layout.tsx"
    if (!mayReadEnvironment && source.includes("process.env")) {
      report(file, "environment-boundary", "read environment variables through @/lib/config/server")
    }

    if (!file.startsWith("scripts/") && /\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i.test(source)) {
      report(file, "migration-boundary", "schema DDL belongs in db/migrations")
    }

    if (lineCount > 700) {
      report(file, "file-size-budget", `${lineCount} lines exceeds the 700-line hard limit; split by responsibility`)
    }
  }
}

if (violations.length) {
  console.error("Architecture checks failed:\n")
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log("Architecture checks passed.")
}
