"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"
import { BookmarkSimple, GitFork, Heart, UsersThree } from "@phosphor-icons/react"

import { likeProject, saveProject, unlikeProject, unsaveProject } from "@/app/actions/explore"
import type { ExploreCard } from "@/features/explore/contracts"
import { cn } from "@/lib/utils"

import { PipelinePulse } from "./pipeline-pulse"

interface ProjectCardProps {
  card: ExploreCard
  onFork?: (card: ExploreCard) => void
}

export function ProjectCard({ card, onFork }: ProjectCardProps) {
  const [liked, setLiked] = useState(card.viewerState.isLiked)
  const [saved, setSaved] = useState(card.viewerState.isSaved)
  const [likeCount, setLikeCount] = useState(card.metrics.likeCount)
  const [, startTransition] = useTransition()

  function handleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !liked
    setLiked(next)
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)))
    startTransition(async () => {
      try {
        if (next) await likeProject(card.projectId)
        else await unlikeProject(card.projectId)
      } catch {
        setLiked(!next)
        setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)))
      }
    })
  }

  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next)
    startTransition(async () => {
      try {
        if (next) await saveProject(card.projectId)
        else await unsaveProject(card.projectId)
      } catch {
        setSaved(!next)
      }
    })
  }

  function handleFork(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onFork?.(card)
  }

  const tags: string[] = []
  if (card.status === "published") tags.push("已发布")
  else tags.push("推进中")
  if (card.openNeeds.length > 0) tags.push("正在招募")
  else if (card.lineage.forkCount > 0) tags.push("已有分支")

  return (
    <Link
      href={`/explore/${card.projectId}`}
      className="group relative block break-inside-avoid rounded-2xl bg-card overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-flame"
    >
      <div
        className="relative w-full overflow-hidden bg-secondary"
        style={{ aspectRatio: card.coverImage ? undefined : "4/3" }}
      >
        {card.coverImage ? (
          <Image
            src={card.coverImage}
            alt={card.title}
            width={card.coverWidth || 480}
            height={card.coverHeight || 360}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-3xl font-serif text-muted-foreground/30 select-none">
            {card.title[0]}
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                tag === "已发布"
                  ? "bg-foreground/90 text-background"
                  : tag === "正在招募"
                    ? "bg-flame/20 text-flame border border-flame/30"
                    : "bg-black/50 text-white border border-white/15",
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
          <p className="font-serif text-sm font-medium leading-snug text-white line-clamp-2">{card.title}</p>
          <p className="mt-0.5 text-[11px] text-white/75 line-clamp-1">{card.activeSummary}</p>
          {card.nextMilestone && (
            <p className="mt-0.5 text-[10px] text-white/55 line-clamp-1">{card.nextMilestone}</p>
          )}
          {card.openNeeds[0] && (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/80">
              <UsersThree className="size-3" />
              需要：{card.openNeeds[0].label}
              {card.openNeeds[0].remaining > 0 ? ` ×${card.openNeeds[0].remaining}` : ""}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black">
              查看企划
            </span>
            {card.permissions.allowFork && (
              <button
                type="button"
                onClick={handleFork}
                aria-label="Fork 企划"
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/25"
              >
                <GitFork className="size-3.5" />
                Fork
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              aria-label={saved ? "取消收藏" : "收藏企划"}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium",
                saved
                  ? "bg-foreground/90 text-background"
                  : "border border-white/20 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              <BookmarkSimple weight={saved ? "fill" : "regular"} className="size-3.5" />
              {saved ? "已收藏" : "收藏"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-snug text-foreground/90">{card.title}</p>
            {card.creator && (
              <p className="mt-0.5 truncate font-serif text-[11px] text-muted-foreground">
                @{card.creator.name}
                {card.collaborators.length > 0 ? ` · ${card.collaborators.length} 位协作者` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? "取消点赞" : "点赞"}
            aria-pressed={liked}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
              liked ? "text-flame" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart weight={liked ? "fill" : "regular"} className="size-3" />
            <span className="font-mono tabular-nums">{likeCount}</span>
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">{card.activeSummary}</span>
          {card.metrics.forkCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-mono">
              <GitFork className="size-3" />
              {card.metrics.forkCount}
            </span>
          )}
        </div>

        <PipelinePulse
          currentStage={card.pipeline.currentStage}
          status={card.status}
          className="mt-2"
        />
      </div>
    </Link>
  )
}
