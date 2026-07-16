import { register } from "node:module"
import { pathToFileURL } from "node:url"
import { resolve as resolvePath } from "node:path"

register(pathToFileURL(resolvePath(import.meta.dirname, "ts-alias-hook.mjs")).href)
