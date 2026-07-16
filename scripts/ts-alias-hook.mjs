import { existsSync } from "node:fs"
import { dirname, resolve as resolvePath } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = resolvePath(import.meta.dirname, "..")

function candidateFiles(base) {
  return [`${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, resolvePath(base, "index.ts"), base]
}

function resolveFile(base) {
  for (const candidate of candidateFiles(base)) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export%20{}", shortCircuit: true }
  }

  if (specifier === "zod") {
    const absolute = resolvePath(root, "node_modules/.pnpm/zod@4.4.3/node_modules/zod/index.js")
    if (existsSync(absolute)) return nextResolve(pathToFileURL(absolute).href, context)
  }

  if (specifier.startsWith("@/")) {
    const absolute = resolveFile(resolvePath(root, specifier.slice(2)))
    if (absolute) return nextResolve(pathToFileURL(absolute).href, context)
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(ts|tsx|mjs|js|json)$/.test(specifier)
  ) {
    const parent = context.parentURL ? fileURLToPath(context.parentURL) : root
    const absolute = resolveFile(resolvePath(dirname(parent), specifier))
    if (absolute) return nextResolve(pathToFileURL(absolute).href, context)
  }

  return nextResolve(specifier, context)
}
