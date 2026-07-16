"use client"

import { useRef, useState } from "react"
import {
  ArrowUpRightIcon,
  CircleIcon,
  CursorIcon,
  FilmStripIcon,
  FrameCornersIcon,
  HandIcon,
  ImageSquareIcon,
  LineSegmentIcon,
  PencilSimpleIcon,
  PolygonIcon,
  SparkleIcon,
  SquareIcon,
  StarIcon,
  TextTIcon,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCanvasStore, type CanvasItemType } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

const creatable: Record<string, { type: CanvasItemType; title: string; width: number; height: number }> = {
  frame: { type: "frame", title: "Frame", width: 520, height: 360 },
  text: { type: "text", title: "文字", width: 300, height: 96 },
  rectangle: { type: "rectangle", title: "矩形", width: 180, height: 140 },
  ellipse: { type: "ellipse", title: "椭圆", width: 160, height: 160 },
  line: { type: "line", title: "线条", width: 220, height: 30 },
  arrow: { type: "arrow", title: "箭头", width: 220, height: 40 },
  star: { type: "star", title: "星形", width: 160, height: 160 },
  polygon: { type: "polygon", title: "多边形", width: 170, height: 150 },
  generator: { type: "generator", title: "图像生成器", width: 500, height: 320 },
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
}: {
  icon: typeof CursorIcon
  label: string
  shortcut?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={shortcut ? `${label} (${shortcut})` : label}
            aria-pressed={active}
            className={cn(
              "flex size-11 items-center justify-center rounded-[14px] transition-colors",
              active ? "bg-foreground text-background" : "text-foreground/75 hover:bg-muted hover:text-foreground",
            )}
          />
        }
      >
        <Icon size={21} weight={active ? "fill" : "regular"} />
      </TooltipTrigger>
      <TooltipContent sideOffset={10} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px]">
        {label}
        {shortcut && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded bg-primary-foreground/20 px-1 text-[11px] font-medium">
            {shortcut}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function CanvasToolbar() {
  const tool = useCanvasStore((s) => s.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const addItem = useCanvasStore((s) => s.addItem)
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [pointerTool, setPointerTool] = useState<"select" | "hand">("select")

  const create = (key: string) => {
    const d = creatable[key]
    addItem({
      id: crypto.randomUUID(),
      ...d,
      x: 280 + Math.random() * 60,
      y: 180 + Math.random() * 40,
      text: key === "text" ? "输入文字" : "",
      fill: key === "frame" ? "#ffffff" : key === "text" ? "transparent" : "#ffffff",
      stroke: "#1f1f1f",
      strokeWidth: 2,
      status: key === "generator" ? "idle" : undefined,
      quality: "medium",
      count: 1,
      layout: "manual",
      aspectLocked: false,
    })
    setTool("select")
  }

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file, n) => {
      const video = file.type.startsWith("video/")
      if (!video && !file.type.startsWith("image/")) return
      addItem({
        id: crypto.randomUUID(),
        type: video ? "video" : "image",
        title: file.name,
        src: URL.createObjectURL(file),
        x: 260 + n * 48,
        y: 160 + n * 48,
        width: video ? 420 : 320,
        height: video ? 236 : 320,
      })
    })
    e.target.value = ""
  }

  const shapeActive = ["rectangle", "ellipse", "line", "arrow", "star", "polygon"].includes(tool)
  const PointerIcon = pointerTool === "hand" ? HandIcon : CursorIcon

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
      <nav
        aria-label="画布工具栏"
        className="pointer-events-auto flex items-center gap-0.5 rounded-[20px] border border-black/5 bg-card px-2 py-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)]"
      >
        <input ref={imageInput} type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} />
        <input ref={videoInput} type="file" accept="video/*" multiple className="sr-only" onChange={onFiles} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="选择工具"
                className={cn(
                  "flex size-11 items-center justify-center rounded-[14px] transition-colors",
                  tool === "select" || tool === "hand"
                    ? "bg-foreground text-background"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setTool(pointerTool)}
              />
            }
          >
            <PointerIcon size={21} weight={tool === "select" || tool === "hand" ? "fill" : "regular"} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={14} className="w-44 rounded-2xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="rounded-xl"
                onClick={() => {
                  setPointerTool("select")
                  setTool("select")
                }}
              >
                <CursorIcon />
                选择
                <DropdownMenuShortcut>V</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl"
                onClick={() => {
                  setPointerTool("hand")
                  setTool("hand")
                }}
              >
                <HandIcon />
                移动
                <DropdownMenuShortcut>H</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="上传素材"
                className="flex size-11 items-center justify-center rounded-[14px] text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            <ImageSquareIcon size={21} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={14} className="w-44 rounded-2xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-xl" onClick={() => imageInput.current?.click()}>
                <ImageSquareIcon />
                上传图片
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => videoInput.current?.click()}>
                <FilmStripIcon />
                上传视频
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton icon={FrameCornersIcon} label="Frame" shortcut="F" active={tool === "frame"} onClick={() => create("frame")} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="图形工具"
                className={cn(
                  "flex size-11 items-center justify-center rounded-[14px] transition-colors",
                  shapeActive ? "bg-foreground text-background" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              />
            }
          >
            <SquareIcon size={21} weight={shapeActive ? "fill" : "regular"} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={14} className="w-44 rounded-2xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("rectangle")}>
                <SquareIcon />
                矩形
                <DropdownMenuShortcut>R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("line")}>
                <LineSegmentIcon />
                线条
                <DropdownMenuShortcut>L</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("arrow")}>
                <ArrowUpRightIcon />
                箭头
                <DropdownMenuShortcut>⇧L</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("ellipse")}>
                <CircleIcon />
                椭圆
                <DropdownMenuShortcut>O</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("polygon")}>
                <PolygonIcon />
                多边形
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => create("star")}>
                <StarIcon />
                星形
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton icon={PencilSimpleIcon} label="铅笔" shortcut="P" active={tool === "pencil"} onClick={() => setTool("pencil")} />
        <ToolButton icon={TextTIcon} label="文字" shortcut="T" active={tool === "text"} onClick={() => create("text")} />

        <span aria-hidden className="mx-1.5 h-6 w-px bg-border" />

        <ToolButton
          icon={SparkleIcon}
          label="图像生成器"
          shortcut="A"
          active={tool === "generator"}
          onClick={() => create("generator")}
        />
      </nav>
    </div>
  )
}
