"use client"

import { memo, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, getBezierPath, useInternalNode, type InternalNode, type Node, type Edge, type EdgeProps, type NodeProps, type NodeChange } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { Item, Trail } from "@/app/editor/types"
import type { MapPreviews } from "@/lib/projects-store"
import { collectPlainText } from "@/app/editor/editor-utils"
import { itemIdsFromContent } from "@/app/editor/plugins/itemLink"
import { GRAPH_COLORS, parseGraphColors, type GraphColor, type GraphColors } from "@/app/editor/graph-colors"

interface KnowledgeGraphProps {
  trails: Trail[]
  items: Record<string, Item>
  mapPreviews?: MapPreviews | null
  activeTrailId?: string
  selectedItemId?: string
  graphColors?: string | null
  onSaveColors?: (colors: string) => Promise<void>
  onSelectItem: (item: Item, trailId?: string) => void
  variant?: "full" | "preview"
}

type GraphMenu = { x: number; y: number } & ({ kind: "item"; sourceId: string } | { kind: "trail"; trailId: string })
type CardData = { itemId: string; trailId?: string; title: string; preview: string; number: number; selected: boolean; shared: boolean; color?: GraphColor }
type CardNode = Node<CardData, "card">
type LaneNode = Node<{ title: string; color?: GraphColor }, "lane">
type GraphNode = CardNode | LaneNode

type Appearance = { id: string; itemId: string; trailId?: string; column: number; row: number }
type ReferenceView = { id: string; sourceId: string; targetId: string; source: Appearance; target: Appearance }

const COLUMN_WIDTH = 480
const COLUMN_GAP = 90
const pairKey = (a: string, b: string) => [a, b].sort().join(":")
function previewText(content: string | null) {
  if (!content) return ""
  try {
    const blocks = (JSON.parse(content) as { root?: { children?: unknown[] } }).root?.children
    if (!Array.isArray(blocks)) return ""
    let preview = ""
    for (const block of blocks) {
      const text = collectPlainText(JSON.stringify({ root: block })).join("").trim()
      if (!text) continue
      preview += `${preview ? "\n\n" : ""}${text}`
      if (preview.length > 256) return `${preview.slice(0, 256).trimEnd()}...`
    }
    return preview
  }
  catch { return "" }
}

const Card = memo(function Card({ data }: NodeProps<CardNode>) {
  return <div className={`relative min-h-[132px] w-[480px] rounded-md border bg-card p-4 ${data.selected ? "border-primary" : "border-border"}`} style={data.color ? { background: `color-mix(in srgb, var(--ed-${data.color}) 16%, var(--card))` } : undefined}>
    <Handle id="target-top" type="target" position={Position.Top} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-bottom" type="source" position={Position.Bottom} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-left" type="target" position={Position.Left} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-right" type="source" position={Position.Right} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-right" type="target" position={Position.Right} className="!pointer-events-none !opacity-0" />
    <Handle id="source-left" type="source" position={Position.Left} className="!pointer-events-none !opacity-0" />
    <Handle id="target-bottom" type="target" position={Position.Bottom} className="!pointer-events-none !opacity-0" />
    <Handle id="source-top" type="source" position={Position.Top} className="!pointer-events-none !opacity-0" />
    <div className="flex items-baseline justify-between gap-2">
      <div className="min-w-0 break-words font-display text-[28px] font-medium leading-tight text-foreground">{data.title}</div>
      <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{data.shared && <span>Shared</span>}<span>{data.number}</span></div>
    </div>
    {data.preview && <div className="mt-2 space-y-3 break-words text-[15px] leading-[1.6] text-foreground">{data.preview.split("\n\n").map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>}
  </div>
})

const Lane = memo(function Lane({ data }: NodeProps<LaneNode>) {
  return <div className="relative h-full w-full text-foreground"><div className="absolute inset-x-0 bottom-0 top-14 rounded-md border border-border bg-muted/20" style={data.color ? { background: `color-mix(in srgb, var(--ed-${data.color}) 12%, var(--popover))` } : undefined} /><div className="absolute left-4 right-4 top-2 truncate font-display text-xl font-medium">{data.title}</div></div>
})

type CardBounds = { id: string; x: number; y: number; width: number; height: number }
type ReferenceEdgeData = { cards: CardBounds[] }

function roundedPath(points: { x: number; y: number }[]) {
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    const before = Math.hypot(current.x - previous.x, current.y - previous.y)
    const after = Math.hypot(next.x - current.x, next.y - current.y)
    if (!before || !after) continue
    const radius = Math.min(18, before / 2, after / 2)
    path += ` L ${current.x + (previous.x - current.x) * radius / before} ${current.y + (previous.y - current.y) * radius / before} Q ${current.x} ${current.y} ${current.x + (next.x - current.x) * radius / after} ${current.y + (next.y - current.y) * radius / after}`
  }
  const last = points[points.length - 1]
  return `${path} L ${last.x} ${last.y}`
}

function curvedPath(start: { x: number; y: number }, end: { x: number; y: number }, sourcePosition: Position, targetPosition: Position) {
  if (start.y === end.y) {
    const third = (end.x - start.x) / 3
    return [`M ${start.x} ${start.y} C ${start.x + third} ${start.y - 18}, ${end.x - third} ${end.y - 18}, ${end.x} ${end.y}`, (start.x + end.x) / 2, start.y - 13.5] as const
  }
  if (start.x === end.x) {
    const third = (end.y - start.y) / 3
    return [`M ${start.x} ${start.y} C ${start.x + 18} ${start.y + third}, ${end.x + 18} ${end.y - third}, ${end.x} ${end.y}`, start.x + 13.5, (start.y + end.y) / 2] as const
  }
  return getBezierPath({ sourceX: start.x, sourceY: start.y, sourcePosition, targetX: end.x, targetY: end.y, targetPosition })
}

function routeEdge(source: InternalNode, target: InternalNode, cards: CardBounds[]) {
  const sx = source.internals.positionAbsolute.x
  const sy = source.internals.positionAbsolute.y
  const sw = source.measured.width ?? 0
  const sh = source.measured.height ?? 0
  const tx = target.internals.positionAbsolute.x
  const ty = target.internals.positionAbsolute.y
  const tw = target.measured.width ?? 0
  const th = target.measured.height ?? 0
  const others = cards.filter(card => card.id !== source.id && card.id !== target.id)
  if (sx + sw <= tx || tx + tw <= sx) {
    const direction = sx < tx ? 1 : -1
    const start = { x: sx + (direction > 0 ? sw : 0), y: sy + sh / 2 }
    const end = { x: tx + (direction > 0 ? 0 : tw), y: ty + th / 2 }
    const left = Math.min(start.x, end.x)
    const right = Math.max(start.x, end.x)
    const between = others.filter(card => card.x < right && card.x + card.width > left)
    if (!between.length) return curvedPath(start, end, direction > 0 ? Position.Right : Position.Left, direction > 0 ? Position.Left : Position.Right)
    const firstX = start.x + direction * 24
    const lastX = end.x - direction * 24
    const candidates = [(start.y + end.y) / 2, ...between.flatMap(card => [card.y - 16, card.y + card.height + 16])]
    const clear = candidates.filter(y => between.every(card => y < card.y - 12 || y > card.y + card.height + 12))
    const y = clear.sort((a, b) => Math.abs(start.y - a) + Math.abs(end.y - a) - Math.abs(start.y - b) - Math.abs(end.y - b))[0]
    const points = [start, { x: firstX, y: start.y }, { x: firstX, y }, { x: lastX, y }, { x: lastX, y: end.y }, end]
    return [roundedPath(points), (firstX + lastX) / 2, y] as const
  }
  const down = sy < ty
  const start = { x: sx + sw / 2, y: sy + (down ? sh : 0) }
  const end = { x: tx + tw / 2, y: ty + (down ? 0 : th) }
  const between = others.some(card => card.x < sx + sw && card.x + card.width > sx && card.y < Math.max(start.y, end.y) && card.y + card.height > Math.min(start.y, end.y))
  if (!between) return curvedPath(start, end, down ? Position.Bottom : Position.Top, down ? Position.Top : Position.Bottom)
  const gutter = Math.max(sx + sw, tx + tw) + 24
  return [roundedPath([{ x: sx + sw, y: sy + sh / 2 }, { x: gutter, y: sy + sh / 2 }, { x: gutter, y: ty + th / 2 }, { x: tx + tw, y: ty + th / 2 }]), gutter, (sy + sh / 2 + ty + th / 2) / 2] as const
}

const FloatingEdge = memo(function FloatingEdge({ source, target, style, data, interactionWidth }: EdgeProps<Edge<ReferenceEdgeData>>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode?.measured.width || !sourceNode.measured.height || !targetNode?.measured.width || !targetNode.measured.height) return null
  const [path] = routeEdge(sourceNode, targetNode, data?.cards ?? [])
  return <BaseEdge path={path} style={style} interactionWidth={interactionWidth} />
})

const nodeTypes = { card: Card, lane: Lane }
const edgeTypes = { floating: FloatingEdge }

export function KnowledgeGraph({ trails, items, mapPreviews, activeTrailId, selectedItemId, graphColors, onSaveColors, onSelectItem, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview"
  const references = useMemo(() => Object.fromEntries(Object.values(items).map(item => [item.id, item.content != null ? itemIdsFromContent(item.content) : mapPreviews?.[item.id]?.linkedItemIds ?? []])), [items, mapPreviews])
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const [selectedConnection, setSelectedConnection] = useState<string>()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<GraphMenu | null>(null)
  const [colors, setColors] = useState<GraphColors>(() => parseGraphColors(graphColors))
  const [savingColors, setSavingColors] = useState(false)
  const graphRef = useRef<HTMLDivElement>(null)

  const { nodes, references: graphReferences, sharedEdges } = useMemo(() => {
    const cardWidth = COLUMN_WIDTH
    const columnGap = COLUMN_GAP
    const inset = 16
    const columns = trails.map(trail => ({ title: trail.title, trailId: trail.id, ids: trail.itemIds.filter(id => items[id]) }))
    const filed = new Set(columns.flatMap(column => column.ids))
    const loose = Object.keys(items).filter(id => !filed.has(id))
    if (loose.length) columns.push({ title: "Notes without a trail", trailId: "", ids: loose })
    const counts = new Map<string, number>()
    columns.forEach(column => column.ids.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1)))
    const appearances = new Map<string, Appearance[]>()
    const nodes: GraphNode[] = []
    columns.forEach((column, columnIndex) => {
      const x = columnIndex * (cardWidth + columnGap)
      let y = 84
      column.ids.forEach((itemId, row) => {
        const item = items[itemId]
        const appearance = { id: `card:${column.trailId || "loose"}:${itemId}`, itemId, trailId: column.trailId || undefined, column: columnIndex, row }
        appearances.set(itemId, [...(appearances.get(itemId) ?? []), appearance])
        nodes.push({ id: appearance.id, type: "card", position: { x: x + inset, y }, data: { itemId, trailId: appearance.trailId, title: item.title, preview: item.content != null ? previewText(item.content) : mapPreviews?.[itemId]?.text ?? "", number: row + 1, selected: preview ? itemId === selectedItemId && (!activeTrailId || activeTrailId === column.trailId) : selectedCardId === appearance.id, shared: (counts.get(itemId) ?? 0) > 1, color: GRAPH_COLORS.find(color => color === colors.items[itemId]) }, draggable: false, zIndex: 1 })
        y += (heights[appearance.id] ?? 132) + 40
      })
      nodes.push({ id: `lane:${column.trailId || "loose"}`, type: "lane", position: { x, y: 0 }, data: { title: column.title, color: GRAPH_COLORS.find(color => color === colors.trails[column.trailId]) }, style: { width: cardWidth + inset * 2, height: Math.max(104, y - inset) }, draggable: false, selectable: false, connectable: false, zIndex: -1 })
    })
    const sharedEdges: Edge[] = []
    for (const [itemId, copies] of appearances) for (let index = 1; index < copies.length; index++) {
      sharedEdges.push({ id: `shared:${copies[index - 1].id}:${copies[index].id}`, source: copies[index - 1].id, target: copies[index].id, sourceHandle: "source-right", targetHandle: "target-left", type: "floating", selectable: false, focusable: false, interactionWidth: 0, style: { stroke: "var(--ed-purple)", strokeWidth: 1.5, strokeDasharray: "2 6", strokeLinecap: "round", opacity: 0.75 }, ariaLabel: `${items[itemId].title} appears in both trails` })
    }
    const graphReferences: ReferenceView[] = []
    const seenPairs = new Set<string>()
    const addConnection = (sourceId: string, targetId: string) => {
      const sources = appearances.get(sourceId)
      const targets = appearances.get(targetId)
      if (!sources?.length || !targets?.length) return
      const pairs = sources.flatMap(source => targets.map(target => ({ source, target, distance: Math.abs(source.column - target.column) * 3 + Math.abs(source.row - target.row) })))
      pairs.sort((a, b) => a.distance - b.distance || a.source.column - b.source.column || a.target.column - b.target.column)
      const view = { id: `connection:${pairKey(sourceId, targetId)}`, sourceId, targetId, source: pairs[0].source, target: pairs[0].target }
      seenPairs.add(pairKey(sourceId, targetId))
      graphReferences.push(view)
    }
    for (const [sourceId, targets] of Object.entries(references)) for (const targetId of targets) {
      const pair = pairKey(sourceId, targetId)
      if (sourceId !== targetId && items[targetId] && !seenPairs.has(pair)) addConnection(sourceId, targetId)
    }
    return { nodes, references: graphReferences, sharedEdges }
  }, [trails, items, mapPreviews, references, selectedItemId, activeTrailId, selectedCardId, preview, heights, colors])

  const onNodesChange = (changes: NodeChange<GraphNode>[]) => {
    const measured = changes.filter(change => change.type === "dimensions" && change.id.startsWith("card:") && change.dimensions?.height)
    if (!measured.length) return
    setHeights(previous => {
      const next = { ...previous }
      let changed = false
      for (const change of measured) if (change.type === "dimensions" && change.dimensions && next[change.id] !== change.dimensions.height) {
        next[change.id] = change.dimensions.height
        changed = true
      }
      return changed ? next : previous
    })
  }

  const cards = nodes.filter((node): node is CardNode => node.type === "card").map(node => ({ id: node.id, x: node.position.x, y: node.position.y, width: COLUMN_WIDTH, height: heights[node.id] ?? 132 }))
  const edges: Edge[] = sharedEdges.map(edge => ({ ...edge, data: { cards } })).concat(graphReferences.map(reference => {
    const { source, target } = reference
    return {
      id: reference.id, source: source.id, target: target.id, type: "floating",
      sourceHandle: "source-right",
      targetHandle: "target-left",
      selected: selectedConnection === reference.id,
      interactionWidth: 40,
      style: { stroke: "var(--primary)", strokeWidth: selectedConnection === reference.id ? 2 : 1.5 },
      data: { cards },
      ariaLabel: `${items[reference.sourceId].title} connected to ${items[reference.targetId].title}`,
    }
  }))
  const selected = graphReferences.find(reference => reference.id === selectedConnection)
  const setBackground = async (color: GraphColor | "") => {
    if (!onSaveColors || !menu || savingColors) return
    const group = menu.kind === "item" ? "items" : "trails"
    const id = menu.kind === "item" ? menu.sourceId : menu.trailId
    const next = { ...colors, [group]: { ...colors[group] } }
    if (color) next[group][id] = color
    else delete next[group][id]
    setColors(next)
    setMenu(null)
    setSavingColors(true)
    try {
      await onSaveColors(JSON.stringify(next))
      setError("")
    } catch {
      setColors(colors)
      setError("Could not save map colors. Please try again.")
    } finally { setSavingColors(false) }
  }
  return <div ref={graphRef} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") setMenu(null) }} className="knowledge-graph relative flex h-full w-full flex-col overflow-hidden rounded-md bg-popover">
    <div className="min-h-0 flex-1">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"} fitView={preview} fitViewOptions={{ padding: 0.1 }} defaultViewport={{ x: 32, y: 32, zoom: 1 }} minZoom={preview ? 0.01 : 0.25} maxZoom={2} nodesDraggable={false} nodesConnectable={false} onEdgeClick={(_, edge) => { if (!graphReferences.some(reference => reference.id === edge.id)) return; setMenu(null); setSelectedCardId(null); setSelectedConnection(edge.id) }} onNodeClick={(event, node) => {
        setMenu(null)
        if (node.type !== "card") return
        event.stopPropagation()
        if (preview || selectedCardId === node.id) onSelectItem(items[node.data.itemId], node.data.trailId)
        else { setSelectedCardId(node.id); setSelectedConnection(undefined) }
      }} onNodeContextMenu={(event, node) => {
        if (preview || !graphRef.current) return
        if (node.type === "card" && !onSaveColors) return
        if (node.type === "lane" && (!onSaveColors || !trails.some(trail => trail.id === node.id.slice(5)))) return
        event.preventDefault()
        const bounds = graphRef.current.getBoundingClientRect()
        const x = Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 264))
        const y = Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 172))
        if (node.type === "card") {
          setMenu({ kind: "item", sourceId: node.data.itemId, x, y })
        } else if (node.type === "lane") setMenu({ kind: "trail", trailId: node.id.slice(5), x, y })
      }} onPaneClick={() => { setMenu(null); setSelectedCardId(null) }} panOnDrag={!preview} zoomOnScroll={!preview} zoomOnPinch={!preview} zoomOnDoubleClick={!preview} elementsSelectable={!preview} nodesFocusable={!preview} edgesFocusable={!preview} proOptions={preview ? { hideAttribution: true } : undefined}>
        {!preview && <Background color="var(--border)" gap={22} size={1} />}
        {!preview && <Controls position="bottom-right" showInteractive={false} />}
      </ReactFlow>
    </div>
    {menu && <div className="absolute z-20 w-64 rounded-md border border-border bg-card p-2 text-sm" style={{ left: menu.x, top: menu.y }} onKeyDown={event => { if (event.key === "Escape") setMenu(null) }}>
      {onSaveColors && <div className="px-2 pt-2">
        <p className="mb-2 text-xs text-muted-foreground">Background color</p>
        <div className="flex flex-wrap gap-2">{(["", ...GRAPH_COLORS] as const).map(color => <button key={color} type="button" disabled={savingColors} aria-label={`${menu.kind === "item" ? "Note" : "Trail"} background: ${color || "Default"}`} aria-pressed={((menu.kind === "item" ? colors.items[menu.sourceId] : colors.trails[menu.trailId]) ?? "") === color} onClick={() => void setBackground(color)} className="h-7 w-7 rounded-full border border-border aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-50" style={{ background: color ? `color-mix(in srgb, var(--ed-${color}) 24%, var(--card))` : "var(--card)" }} />)}</div>
      </div>}
    </div>}
    {!preview && (selected || error) && <div className="shrink-0 border-t border-border px-5 py-3 text-xs text-muted-foreground">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {selected && <div role="status" className="max-h-48 overflow-auto break-words"><p className="mb-2 font-medium text-foreground">{items[selected.sourceId].title} — {items[selected.targetId].title}</p><p>Linked in note.</p></div>}
    </div>}
  </div>
}
