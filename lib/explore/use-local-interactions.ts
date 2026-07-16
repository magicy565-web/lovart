"use client"

import { useCallback, useEffect, useState } from "react"
import type { ExploreCard } from "@/features/explore/contracts"

const LIKED_KEY = "explore_liked_ids"
const SAVED_KEY = "explore_saved_cards"

function readLiked(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")) }
  catch { return new Set() }
}

function readSaved(): ExploreCard[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") }
  catch { return [] }
}

export function useLiked(projectId: string) {
  const [liked, setLiked] = useState(false)
  useEffect(() => { setLiked(readLiked().has(projectId)) }, [projectId])

  const toggle = useCallback(() => {
    setLiked((prev) => {
      const ids = readLiked()
      if (prev) { ids.delete(projectId) } else { ids.add(projectId) }
      localStorage.setItem(LIKED_KEY, JSON.stringify([...ids]))
      return !prev
    })
  }, [projectId])

  return { liked, toggle }
}

export function useSaved(card: ExploreCard) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setSaved(readSaved().some((c) => c.projectId === card.projectId))
  }, [card.projectId])

  const toggle = useCallback(() => {
    setSaved((prev) => {
      const cards = readSaved()
      const next = prev
        ? cards.filter((c) => c.projectId !== card.projectId)
        : [...cards, card]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      return !prev
    })
  }, [card])

  return { saved, toggle }
}

export function useSavedCards(): ExploreCard[] {
  const [cards, setCards] = useState<ExploreCard[]>([])
  useEffect(() => { setCards(readSaved()) }, [])
  return cards
}
