"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MinusIcon,
  PlusIcon,
  StackSimpleIcon,
  XIcon,
} from "@phosphor-icons/react"
import { toPng } from "html-to-image"
import { ReactFlow, useReactFlow, type Edge, type Node, type NodeTypes, type ReactFlowInstance } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { CanvasNode } from "@/components/studio/canvas-node"
import { CanvasToolbar } from "@/components/studio/canvas-toolbar"
import { Inspector } from "@/components/studio/inspector"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useCanvasStore, type CanvasItem } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

const nodeTypes: NodeTypes = { canvasItem: CanvasNode }

function ZoomCluster({ zoom, onLayers }: { zoom: number; onLayers: () => void }) {
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const past = useCanvasStore((s) => s.past)
  const future = useCanvasStore((s) => s.future)
  return (
    <div className="pointer-events-none absolute bottom-6 left-5 z-10 flex items-center gap-2">
      <div className="pointer-events-auto flex items-center rounded-2xl border border-black/5 bg-card px-1 py-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.14)]">
        <button type="button" aria-label="图层" onClick={onLayers} className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted hover:text-foreground">
          <StackSimpleIcon size={18} />
        </button>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" aria-label="缩小" onClick={() => zoomOut({ duration: 150 })} className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted hover:text-foreground">
          <MinusIcon size={16} />
        </button>
        <button type="button" aria-label="适配全部对象" onClick={() => void fitView({ padding: 0.18, duration: 220 })} className="min-w-11 rounded-lg px-1 py-2 text-center text-[13px] font-medium tabular-nums text-foreground/80 hover:bg-muted">{zoom}%</button>
        <button type="button" aria-label="放大" onClick={() => zoomIn({ duration: 150 })} className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted hover:text-foreground">
          <PlusIcon size={16} />
        </button>
      </div>
      <div className="pointer-events-auto flex items-center rounded-2xl border border-black/5 bg-card px-1 py-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.14)]">
        <button type="button" aria-label="撤销" disabled={!past.length} onClick={undo} className={cn("flex size-9 items-center justify-center rounded-xl transition-colors", past.length ? "text-foreground/70 hover:bg-muted hover:text-foreground" : "text-foreground/25")}>
          <ArrowUUpLeftIcon size={18} />
        </button>
        <button type="button" aria-label="重做" disabled={!future.length} onClick={redo} className={cn("flex size-9 items-center justify-center rounded-xl transition-colors", future.length ? "text-foreground/70 hover:bg-muted hover:text-foreground" : "text-foreground/25")}>
          <ArrowUUpRightIcon size={18} />
        </button>
      </div>
    </div>
  )
}

export function StudioCanvas() {
  const items = useCanvasStore((s) => s.items)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const tool = useCanvasStore((s) => s.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const select = useCanvasStore((s) => s.selectItems)
  const move = useCanvasStore((s) => s.moveItem)
  const commitMove = useCanvasStore((s) => s.commitMove)
  const remove = useCanvasStore((s) => s.removeSelected)
  const duplicate = useCanvasStore((s) => s.duplicateSelected)
  const copy = useCanvasStore((s) => s.copy)
  const cut = useCanvasStore((s) => s.cut)
  const paste = useCanvasStore((s) => s.paste)
  const layer = useCanvasStore((s) => s.moveLayer)
  const toggleLocked = useCanvasStore((s) => s.toggleLocked)
  const toggleHidden = useCanvasStore((s) => s.toggleHidden)
  const group = useCanvasStore((s) => s.group)
  const ungroup = useCanvasStore((s) => s.ungroup)
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const add = useCanvasStore((s) => s.addItem)
  const checkpoint = useCanvasStore((s) => s.checkpoint)
  const moveItems = useCanvasStore((s) => s.moveItems)
  const alignSelected = useCanvasStore((s) => s.alignSelected)

  const [zoom, setZoom] = useState(100)
  const [layersOpen, setLayersOpen] = useState(false)
  const [layersTab, setLayersTab] = useState<"layers" | "files">("layers")
  const [space, setSpace] = useState(false)
  const [flow, setFlow] = useState<ReactFlowInstance<Node, Edge> | null>(null)
  const [drawing, setDrawing] = useState<{x:number;y:number}[]>([])
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const dragBase = useRef<{id:string;x:number;y:number}[]>([])
  const canvas = useRef<HTMLDivElement>(null)
  const edges = useMemo<Edge[]>(() => [], [])

  const nodes = useMemo<Node[]>(
    () =>
      items
        .filter((i) => !i.hidden)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((i) => ({
          id: i.id,
          type: "canvasItem",
          position: { x: i.x, y: i.y },
          data: i,
          width: i.width,
          height: i.height,
          style: { width: i.width, height: i.height, zIndex: i.zIndex },
          selected: selectedIds.includes(i.id),
          draggable: !i.locked,
        })),
    [items, selectedIds],
  )

  useEffect(() => {
    const isTyping = () => {
      const e = document.activeElement as HTMLElement | null
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable)
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return
      const mod = e.metaKey || e.ctrlKey
      if (e.code === "Space") {
        e.preventDefault()
        setSpace(true)
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === "c") copy()
      else if (mod && e.key.toLowerCase() === "x") cut()
      else if (mod && e.key.toLowerCase() === "v") paste()
      else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicate()
      } else if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault()
        if (e.shiftKey) ungroup()
        else group()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault()
        toggleHidden()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        toggleLocked()
      } else if (mod && e.key === "]") layer("up")
      else if (mod && e.key === "[") layer("down")
      else if (!mod && e.key === "]") layer("front")
      else if (!mod && e.key === "[") layer("back")
      else if (["Delete", "Backspace"].includes(e.key)) remove()
      else if (!mod) {
        const map: Record<string, typeof tool> = {
          v: "select",
          h: "hand",
          t: "text",
          f: "frame",
          r: "rectangle",
          o: "ellipse",
          l: e.shiftKey ? "arrow" : "line",
          p: "pencil",
          a: "generator",
        }
        const next = map[e.key.toLowerCase()]
        if (next) setTool(next)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false)
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [copy, cut, duplicate, group, layer, paste, redo, remove, setTool, toggleHidden, toggleLocked, tool, undo, ungroup])

  function paneClick(e: React.MouseEvent) {
    if (["text", "frame", "rectangle", "ellipse", "star", "polygon", "line", "arrow", "generator"].includes(tool)) {
      if (!flow) return
      const { x, y } = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const presets: Record<string, Partial<CanvasItem>> = {
        text: { type: "text", title: "文字", text: "输入文字", width: 280, height: 90 },
        frame: { type: "frame", title: "Frame", width: 520, height: 360 },
        generator: { type: "generator", title: "图像生成器", width: 500, height: 320, status: "idle", quality: "medium", count: 1 },
        rectangle: { type: "rectangle", title: "矩形", width: 180, height: 140 },
        ellipse: { type: "ellipse", title: "椭圆", width: 160, height: 160 },
        line: { type: "line", title: "线条", width: 220, height: 30 },
        arrow: { type: "arrow", title: "箭头", width: 220, height: 40 },
        star: { type: "star", title: "星形", width: 160, height: 160 },
        polygon: { type: "polygon", title: "多边形", width: 170, height: 150 },
      }
      add({ id: crypto.randomUUID(), x, y, fill: "#ffffff", stroke: "#1f1f1f", strokeWidth: 2, ...presets[tool] } as Omit<CanvasItem, "zIndex">)
      setTool("select")
    } else select([])
  }

  function drawPoint(e: React.PointerEvent) {
    if (!flow) return
    const point = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setDrawing((current) => [...current, point])
  }
  function finishDrawing() {
    if (drawing.length < 2) { setDrawing([]); return }
    const minX=Math.min(...drawing.map(p=>p.x)), minY=Math.min(...drawing.map(p=>p.y)), maxX=Math.max(...drawing.map(p=>p.x)), maxY=Math.max(...drawing.map(p=>p.y))
    const width=Math.max(8,maxX-minX),height=Math.max(8,maxY-minY)
    const path=drawing.map((p,i)=>`${i?'L':'M'} ${((p.x-minX)/width)*100} ${((p.y-minY)/height)*100}`).join(' ')
    add({id:crypto.randomUUID(),type:'drawing',title:'铅笔绘制',x:minX,y:minY,width,height,path,stroke:'#242424',strokeWidth:2,fill:'none'})
    setDrawing([]);setTool('select')
  }

  async function exportSelected() {
    for (const itemId of selectedIds) {
      const element=document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(itemId)}"]`)
      if(!element) continue
      const url=await toPng(element,{pixelRatio:2,cacheBust:true,backgroundColor:'transparent'})
      const a=document.createElement('a');a.href=url;a.download=`${items.find(i=>i.id===itemId)?.title||'canvas-object'}.png`;a.click()
    }
  }

  const picked = items.filter((i) => selectedIds.includes(i.id))
  const locked = picked.some((i) => i.locked)
  const hidden = picked.some((i) => i.hidden)

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div ref={canvas} tabIndex={-1} onPointerDown={() => canvas.current?.focus({ preventScroll: true })} className="size-full outline-none" />}>
        <div className="relative size-full overflow-hidden bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            minZoom={0.1}
            maxZoom={3}
            panOnDrag={tool === "hand" || space ? [0, 1, 2] : [1, 2]}
            selectionOnDrag={tool === "select" && !space}
            nodesDraggable={tool === "select" && !space}
            onInit={(instance) => setFlow(instance as ReactFlowInstance<Node, Edge>)}
            onMove={(_, v) => setZoom(Math.round(v.zoom * 100))}
            onNodeDragStart={(_, n) => { checkpoint('移动对象'); const source=items.find(i=>i.id===n.id); const grouped=source?.groupId?items.filter(i=>i.groupId===source.groupId).map(i=>i.id):[]; const children=source?.type==='frame'?items.filter(i=>i.id!==source.id&&i.x>=source.x&&i.y>=source.y&&i.x+i.width<=source.x+source.width&&i.y+i.height<=source.y+source.height).map(i=>i.id):[]; const ids=[n.id,...grouped,...children]; dragBase.current=items.filter(i=>ids.includes(i.id)).map(i=>({id:i.id,x:i.x,y:i.y})) }}
            onNodeDrag={(_, n) => {
              const origin=dragBase.current.find(i=>i.id===n.id); if(!origin){move(n.id,n.position.x,n.position.y);return}
              let dx=n.position.x-origin.x,dy=n.position.y-origin.y
              // 吸附对齐：比较拖动对象与其他对象的边缘和中心
              const dragged=items.find(i=>i.id===n.id)
              const draggedIds=new Set(dragBase.current.map(i=>i.id))
              const threshold=6/(zoom/100)
              const gx:number[]=[],gy:number[]=[]
              if(dragged){
                const left=origin.x+dx,cx=left+dragged.width/2,right=left+dragged.width
                const top=origin.y+dy,cy=top+dragged.height/2,bottom=top+dragged.height
                let bestX:{delta:number;line:number}|null=null,bestY:{delta:number;line:number}|null=null
                for(const other of items){
                  if(draggedIds.has(other.id)||other.hidden)continue
                  for(const target of [other.x,other.x+other.width/2,other.x+other.width])
                    for(const edge of [left,cx,right]){const delta=target-edge;if(Math.abs(delta)<=threshold&&(!bestX||Math.abs(delta)<Math.abs(bestX.delta)))bestX={delta,line:target}}
                  for(const target of [other.y,other.y+other.height/2,other.y+other.height])
                    for(const edge of [top,cy,bottom]){const delta=target-edge;if(Math.abs(delta)<=threshold&&(!bestY||Math.abs(delta)<Math.abs(bestY.delta)))bestY={delta,line:target}}
                }
                if(bestX){dx+=bestX.delta;gx.push(bestX.line)}
                if(bestY){dy+=bestY.delta;gy.push(bestY.line)}
              }
              setGuides({x:gx,y:gy})
              moveItems(dragBase.current.map(i=>({id:i.id,x:i.x+dx,y:i.y+dy})))
            }}
            onNodeDragStop={() => { setGuides({ x: [], y: [] }); commitMove() }}
            onNodeClick={(e, n) =>
              select(
                e.shiftKey
                  ? selectedIds.includes(n.id)
                    ? selectedIds.filter((id) => id !== n.id)
                    : [...selectedIds, n.id]
                  : [n.id],
              )
            }
            onPaneClick={paneClick}
            deleteKeyCode={null}
            multiSelectionKeyCode="Shift"
            proOptions={{ hideAttribution: true }}
          >
            <ZoomCluster zoom={zoom} onLayers={() => setLayersOpen((open) => !open)} />
          </ReactFlow>
          {(guides.x.length > 0 || guides.y.length > 0) && flow && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full">
              {guides.x.map((gx) => {
                const screen = flow.flowToScreenPosition({ x: gx, y: 0 })
                const rect = canvas.current?.getBoundingClientRect()
                const x = rect ? screen.x - rect.left : screen.x
                return <line key={`x${gx}`} x1={x} y1={0} x2={x} y2="100%" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 3" />
              })}
              {guides.y.map((gy) => {
                const screen = flow.flowToScreenPosition({ x: 0, y: gy })
                const rect = canvas.current?.getBoundingClientRect()
                const y = rect ? screen.y - rect.top : screen.y
                return <line key={`y${gy}`} x1={0} y1={y} x2="100%" y2={y} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 3" />
              })}
            </svg>
          )}
          <Inspector />
          {layersOpen && (
            <aside aria-label="图层面板" className="absolute bottom-20 left-5 z-20 flex max-h-[min(480px,65vh)] w-72 flex-col overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_18px_48px_-12px_rgba(0,0,0,0.22)]">
              <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center rounded-xl bg-muted p-0.5">
                  <button type="button" onClick={() => setLayersTab("layers")} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", layersTab === "layers" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>图层</button>
                  <button type="button" onClick={() => setLayersTab("files")} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", layersTab === "files" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>生成文件</button>
                </div>
                <button type="button" aria-label="关闭图层面板" onClick={() => setLayersOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><XIcon size={16} /></button>
              </header>
              <div className="min-h-0 overflow-y-auto p-2">
                {layersTab === "layers" ? <>
                  {[...items].sort((a,b)=>b.zIndex-a.zIndex).map((item) => (
                    <div key={item.id} role="button" tabIndex={0} onClick={() => select([item.id])} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") select([item.id]) }} className={cn("group flex items-center gap-2 rounded-xl px-2 py-2 text-sm", selectedIds.includes(item.id) ? "bg-muted text-foreground" : "text-foreground/75 hover:bg-muted/70")}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-medium uppercase">{item.type.slice(0,1)}</span><span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <button type="button" aria-label={item.hidden ? `显示 ${item.title}` : `隐藏 ${item.title}`} onClick={(event) => { event.stopPropagation(); select([item.id]); queueMicrotask(() => useCanvasStore.getState().toggleHidden()) }} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground">{item.hidden ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}</button>
                      <button type="button" aria-label={item.locked ? `解锁 ${item.title}` : `锁定 ${item.title}`} onClick={(event) => { event.stopPropagation(); select([item.id]); queueMicrotask(() => useCanvasStore.getState().toggleLocked()) }} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground">{item.locked ? <LockSimpleIcon size={14} weight="fill" /> : <LockSimpleOpenIcon size={14} />}</button>
                    </div>
                  ))}
                  {!items.length && <p className="px-3 py-10 text-center text-sm text-muted-foreground">画布中还没有对象</p>}
                </> : <>
                  {items.filter((item) => item.type === "image" && item.src).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"><img src={item.src} alt="" className="size-10 rounded-lg bg-muted object-cover" /><button type="button" onClick={() => select([item.id])} className="min-w-0 flex-1 truncate text-left text-sm">{item.title}</button><button type="button" aria-label={`下载 ${item.title}`} onClick={() => { const a=document.createElement("a");a.href=item.src!;a.download=`${item.title}.png`;a.click() }} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"><DownloadSimpleIcon size={16} /></button></div>)}
                  {!items.some((item) => item.type === "image" && item.src) && <p className="px-3 py-10 text-center text-sm text-muted-foreground">还没有生成图片</p>}
                </>}
              </div>
            </aside>
          )}
          {tool === 'pencil' && (
            <div className="absolute inset-0 z-[5] cursor-crosshair touch-none" onPointerDown={(e)=>{e.currentTarget.setPointerCapture(e.pointerId);drawPoint(e)}} onPointerMove={(e)=>{if(e.currentTarget.hasPointerCapture(e.pointerId))drawPoint(e)}} onPointerUp={finishDrawing} onPointerCancel={()=>setDrawing([])}>
              {drawing.length > 1 && <svg className="pointer-events-none absolute inset-0 size-full"><polyline points={drawing.map(p=>{const screen=flow?.flowToScreenPosition(p);const rect=canvas.current?.getBoundingClientRect();return screen&&rect?`${screen.x-rect.left},${screen.y-rect.top}`:'0,0'}).join(' ')} fill="none" stroke="#242424" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
          )}
          <CanvasToolbar />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-60 rounded-2xl p-1.5">
        <ContextMenuGroup>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={copy}>
            复制
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={cut}>
            剪切
            <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" onClick={paste}>
            粘贴
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={duplicate}>
            创建副本
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={() => layer("up")}>
            上移一层
            <ContextMenuShortcut>Ctrl+]</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={() => layer("down")}>
            下移一层
            <ContextMenuShortcut>Ctrl+[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={() => layer("front")}>
            移动至顶层
            <ContextMenuShortcut>]</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={() => layer("back")}>
            移动至底层
            <ContextMenuShortcut>[</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            className="rounded-xl"
            disabled={picked.length !== 1 || picked[0]?.type !== "image" || !picked[0]?.src}
            onClick={() => {
              const source = picked[0]
              if (!source?.src) return
              add({ id: crypto.randomUUID(), type: "generator", title: "Remix 生成器", width: 500, height: 360, status: "idle", quality: "medium", count: 1, src: source.src, prompt: source.title.replace(/^变体 \d+ · /, ""), x: source.x, y: source.y + source.height + 48 }, "以图生图 Remix")
            }}
          >
            以此图生成变体
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          {([
            ["left", "左对齐"], ["centerX", "水平居中"], ["right", "右对齐"],
            ["top", "顶对齐"], ["centerY", "垂直居中"], ["bottom", "底对齐"],
            ["distributeX", "水平等距分布"], ["distributeY", "垂直等距分布"],
          ] as const).map(([mode, label]) => (
            <ContextMenuItem key={mode} className="rounded-xl" disabled={picked.length < 2 || (mode.startsWith("distribute") && picked.length < 3)} onClick={() => alignSelected(mode)}>
              {label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem className="rounded-xl" disabled={selectedIds.length < 2} onClick={group}>
            创建编组
            <ContextMenuShortcut>Ctrl+G</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!picked.some((i) => i.groupId)} onClick={ungroup}>
            解除编组
            <ContextMenuShortcut>Ctrl+Shift+G</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={toggleHidden}>
            {hidden ? "显示" : "隐藏"}
            <ContextMenuShortcut>Ctrl+Shift+H</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={toggleLocked}>
            {locked ? "解锁" : "锁定"}
            <ContextMenuShortcut>Ctrl+Shift+L</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem className="rounded-xl" disabled={!selectedIds.length} onClick={() => void exportSelected()}>
            导出
          </ContextMenuItem>
          <ContextMenuItem className="rounded-xl" variant="destructive" disabled={!selectedIds.length} onClick={remove}>
            删除
            <ContextMenuShortcut>Delete</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
