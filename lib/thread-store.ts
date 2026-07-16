"use client"

export type StoredMessage = { id: string; role: string; parts?: Array<{ type: string; text?: string; [key: string]: unknown }>; [key: string]: unknown }

export type LocalThread = { id: string; title: string; messages: StoredMessage[]; createdAt: number; updatedAt: number }

const key = (projectId: string) => `lovart:threads:${projectId}`

export function readThreads(projectId: string): LocalThread[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(key(projectId)) ?? "[]") as LocalThread[] } catch { return [] }
}

export function writeThreads(projectId: string, threads: LocalThread[]) {
  localStorage.setItem(key(projectId), JSON.stringify(threads.slice(0, 30)))
}

export function newThread(): LocalThread {
  const now = Date.now()
  return { id: crypto.randomUUID(), title: "新对话", messages: [], createdAt: now, updatedAt: now }
}

export function titleFromMessages(messages: StoredMessage[]) {
  const first = messages.find((message) => message.role === "user")
  if (!first) return "新对话"
  const text = first.parts?.filter((part) => part.type === "text").map((part) => part.text).join(" ").trim()
  return text ? text.slice(0, 28) : "新对话"
}
