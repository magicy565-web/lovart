export function safeAuthCallback(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/studio"
  return value
}
