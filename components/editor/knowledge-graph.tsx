"use client"

import { memo, useCallback, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, useInternalNode, type InternalNode, type Node, type Edge, type EdgeProps, type NodeProps, type Connection, type NodeChange } from "@xyflow/react"
import { MessageSquareText } from "lucide-react"
import "@xyflow/react/dist/style.css"
import type { Item, Trail } from "@/app/editor/types"
import { collectPlainText } from "@/app/editor/editor-utils"
import { itemIdsFromContent } from "@/app/editor/plugins/itemLink"
import { GRAPH_COLORS, parseGraphColors, type GraphColor, type GraphColors } from "@/app/editor/graph-colors"
import { ConnectionComment } from "@/components/editor/connection-comment"

interface KnowledgeGraphProps {
  trails: Trail[]
  items: Record<string, Item>
  activeTrailId?: string
  selectedItemId?: string
  graphColors?: string | null
  onSaveColors?: (colors: string) => Promise<void>
  onSelectItem: (item: Item, trailId?: string) => void
  onTie?: (itemId: string, targetId: string, text: string) => Promise<void>
  onUpdateAssociation?: (itemId: string, associationId: string, text: string) => Promise<void>
  onUntie?: (itemId: string, associationId: string) => Promise<void>
  variant?: "full" | "preview"
}

type GraphMenu = { x: number; y: number } & ({ kind: "item"; sourceId: string; sourceVisualId: string; sourceX: number; sourceY: number } | { kind: "trail"; trailId: string })
type CardData = { itemId: string; trailId?: string; title: string; preview: string; compact: boolean; number: number; selected: boolean; shared: boolean; color?: GraphColor; connectRole?: "source" | "target" }
type CardNode = Node<CardData, "card">
type LaneNode = Node<{ title: string; color?: GraphColor }, "lane">
type GraphNode = CardNode | LaneNode

type Appearance = { id: string; itemId: string; trailId?: string; column: number; row: number }
type AssociationView = { id: string; associationId?: string; sourceId: string; targetId: string; text: string | null; source: Appearance; target: Appearance }
type LocalConnection = { sourceId: string; targetId: string; sourceVisualId: string; targetVisualId: string }

const COLUMN_WIDTH = 420
const COLUMN_GAP = 90
const pairKey = (a: string, b: string) => [a, b].sort().join(":")
const locallyConnected = (connections: LocalConnection[], a: string, b: string) =>
  connections.some(connection => connection.sourceId === a && connection.targetId === b || connection.sourceId === b && connection.targetId === a)
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
  return <div className={`relative rounded-md border bg-card ${data.compact ? "min-h-[72px] w-[140px] p-2" : "min-h-[132px] w-[420px] p-4"} ${data.selected ? "border-primary" : "border-border"}`} style={data.color ? { background: `color-mix(in srgb, var(--ed-${data.color}) 16%, var(--card))` } : undefined}>
    <Handle id="target-top" type="target" position={Position.Top} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-bottom" type="source" position={Position.Bottom} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-left" type="target" position={Position.Left} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-right" type="source" position={Position.Right} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-right" type="target" position={Position.Right} className="!pointer-events-none !opacity-0" />
    <Handle id="source-left" type="source" position={Position.Left} className="!pointer-events-none !opacity-0" />
    <Handle id="target-bottom" type="target" position={Position.Bottom} className="!pointer-events-none !opacity-0" />
    <Handle id="source-top" type="source" position={Position.Top} className="!pointer-events-none !opacity-0" />
    <div className="flex items-baseline justify-between gap-2">
      <div className={`min-w-0 break-words font-display font-medium leading-tight text-foreground ${data.compact ? "line-clamp-2 text-[22px]" : "text-lg"}`}>{data.title}</div>
      <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{data.shared && !data.compact && <span>Shared</span>}<span>{data.number}</span></div>
    </div>
    {!data.compact && <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{data.preview || "No preview available"}</div>}
    {data.connectRole && <Handle id={`easy-${data.connectRole}`} type={data.connectRole} position={data.connectRole === "source" ? Position.Right : Position.Left} className={`easy-connect-${data.connectRole} !absolute !left-0 !top-0 !h-full !w-full !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-transparent !opacity-0`} isConnectableStart={data.connectRole === "source"} isConnectableEnd={data.connectRole === "target"} />}
  </div>
})

const Lane = memo(function Lane({ data }: NodeProps<LaneNode>) {
  return <div className="relative h-full w-full text-foreground"><div className="absolute inset-x-0 bottom-0 top-14 rounded-md border border-border bg-muted/20" style={data.color ? { background: `color-mix(in srgb, var(--ed-${data.color}) 12%, var(--popover))` } : undefined} /><div className="absolute left-4 right-4 top-2 truncate font-display text-xl font-medium">{data.title}</div></div>
})

type CardBounds = { id: string; x: number; y: number; width: number; height: number }
type CommentEdgeData = { hasComment?: boolean; onSelect?: () => void; cards: CardBounds[] }

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

const FloatingEdge = memo(function FloatingEdge({ source, target, style, data, interactionWidth }: EdgeProps<Edge<CommentEdgeData>>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode?.measured.width || !sourceNode.measured.height || !targetNode?.measured.width || !targetNode.measured.height) return null
  const [path, labelX, labelY] = routeEdge(sourceNode, targetNode, data?.cards ?? [])
  return <>
    <BaseEdge path={path} style={style} interactionWidth={interactionWidth} />
    {data?.hasComment && <EdgeLabelRenderer><button type="button" aria-label="View connection comment" title="Connection comment" onClick={event => { event.stopPropagation(); data.onSelect?.() }} className="nodrag nopan pointer-events-auto absolute flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}><MessageSquareText className="h-3 w-3" /></button></EdgeLabelRenderer>}
  </>
})

const nodeTypes = { card: Card, lane: Lane }
const edgeTypes = { floating: FloatingEdge }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, graphColors, onSaveColors, onSelectItem, onTie, onUpdateAssociation, onUntie, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview"
  const references = useMemo(() => Object.fromEntries(Object.values(items).map(item => [item.id, itemIdsFromContent(item.content)])), [items])
  const connected = useCallback((a: string, b: string) =>
    items[a]?.associations.some(association => association.targetId === b) || items[b]?.associations.some(association => association.targetId === a) || references[a]?.includes(b) || references[b]?.includes(a), [items, references])
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const [selectedConnection, setSelectedConnection] = useState<string>()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<GraphMenu | null>(null)
  const [colors, setColors] = useState<GraphColors>(() => parseGraphColors(graphColors))
  const [savingColors, setSavingColors] = useState(false)
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [link, setLink] = useState<{ sourceId: string; sourceVisualId: string; x: number; y: number } | null>(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [connecting, setConnecting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [localConnections, setLocalConnections] = useState<LocalConnection[]>([])
  const graphRef = useRef<HTMLDivElement>(null)
  const sourceHandle = (sourceVisualId: string) => Array.from(graphRef.current?.querySelectorAll<HTMLElement>(".easy-connect-source") ?? []).find(handle => handle.dataset.nodeid === sourceVisualId)
  const cancelLink = () => {
    if (link) sourceHandle(link.sourceVisualId)?.click()
    setLink(null)
  }

  const { nodes, associations, sharedEdges } = useMemo(() => {
    const cardWidth = preview ? 140 : COLUMN_WIDTH
    const columnGap = preview ? 36 : COLUMN_GAP
    const inset = preview ? 8 : 16
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
      let y = preview ? 64 : 84
      column.ids.forEach((itemId, row) => {
        const item = items[itemId]
        const appearance = { id: `card:${column.trailId || "loose"}:${itemId}`, itemId, trailId: column.trailId || undefined, column: columnIndex, row }
        appearances.set(itemId, [...(appearances.get(itemId) ?? []), appearance])
        nodes.push({ id: appearance.id, type: "card", position: { x: x + inset, y }, data: { itemId, trailId: appearance.trailId, title: item.title, preview: preview ? "" : previewText(item.content), compact: preview, number: row + 1, selected: preview ? itemId === selectedItemId && (!activeTrailId || activeTrailId === column.trailId) : selectedCardId === appearance.id, shared: (counts.get(itemId) ?? 0) > 1, color: GRAPH_COLORS.find(color => color === colors.items[itemId]), connectRole: link?.sourceVisualId === appearance.id ? "source" : link && itemId !== link.sourceId && !connected(link.sourceId, itemId) && !locallyConnected(localConnections, link.sourceId, itemId) ? "target" : undefined }, draggable: false, zIndex: 1 })
        y += (heights[appearance.id] ?? (preview ? 72 : 132)) + (preview ? 16 : 40)
      })
      nodes.push({ id: `lane:${column.trailId || "loose"}`, type: "lane", position: { x, y: 0 }, data: { title: column.title, color: GRAPH_COLORS.find(color => color === colors.trails[column.trailId]) }, style: { width: cardWidth + inset * 2, height: Math.max(preview ? 80 : 104, y - inset) }, draggable: false, selectable: false, connectable: false, zIndex: -1 })
    })
    const sharedEdges: Edge[] = []
    for (const [itemId, copies] of appearances) for (let index = 1; index < copies.length; index++) {
      sharedEdges.push({ id: `shared:${copies[index - 1].id}:${copies[index].id}`, source: copies[index - 1].id, target: copies[index].id, sourceHandle: "source-right", targetHandle: "target-left", type: "floating", selectable: false, focusable: false, interactionWidth: 0, style: { stroke: "var(--ed-purple)", strokeWidth: 1.5, strokeDasharray: "2 6", strokeLinecap: "round", opacity: 0.75 }, ariaLabel: `${items[itemId].title} appears in both trails` })
    }
    const associations: AssociationView[] = []
    const seenPairs = new Map<string, AssociationView>()
    const addConnection = (sourceId: string, targetId: string, associationId: string | undefined, content: string | null) => {
      const sources = appearances.get(sourceId)
      const targets = appearances.get(targetId)
      if (!sources?.length || !targets?.length) return
      const pairs = sources.flatMap(source => targets.map(target => ({ source, target, distance: Math.abs(source.column - target.column) * 3 + Math.abs(source.row - target.row) })))
      pairs.sort((a, b) => a.distance - b.distance || a.source.column - b.source.column || a.target.column - b.target.column)
      const view = { id: `connection:${pairKey(sourceId, targetId)}`, associationId, sourceId, targetId, text: content, source: pairs[0].source, target: pairs[0].target }
      seenPairs.set(pairKey(sourceId, targetId), view)
      associations.push(view)
    }
    for (const item of Object.values(items)) for (const association of item.associations ?? []) {
      const pair = pairKey(item.id, association.targetId)
      const existing = seenPairs.get(pair)
      if (existing) {
        if (existing.associationId !== association.id && association.text?.trim() && association.text !== existing.text)
          existing.text = existing.text ? `${existing.text}\n\n${association.text}` : association.text
        continue
      }
      addConnection(item.id, association.targetId, association.id, association.text)
    }
    for (const [sourceId, targets] of Object.entries(references)) for (const targetId of targets) {
      const pair = pairKey(sourceId, targetId)
      if (sourceId !== targetId && items[targetId] && !seenPairs.has(pair)) addConnection(sourceId, targetId, undefined, null)
    }
    for (const connection of localConnections) {
      if (connected(connection.sourceId, connection.targetId)) continue
      const source = appearances.get(connection.sourceId)?.find(appearance => appearance.id === connection.sourceVisualId)
      const target = appearances.get(connection.targetId)?.find(appearance => appearance.id === connection.targetVisualId)
      if (source && target) associations.push({ id: `local:${source.id}:${target.id}`, sourceId: connection.sourceId, targetId: connection.targetId, text: null, source, target })
    }
    return { nodes, associations, sharedEdges }
  }, [trails, items, references, connected, selectedItemId, activeTrailId, selectedCardId, preview, heights, link, localConnections, colors])

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

  const cards = nodes.filter((node): node is CardNode => node.type === "card").map(node => ({ id: node.id, x: node.position.x, y: node.position.y, width: preview ? 140 : COLUMN_WIDTH, height: heights[node.id] ?? (preview ? 72 : 132) }))
  const edges: Edge[] = sharedEdges.map(edge => ({ ...edge, data: { cards } })).concat(associations.map(association => {
    const { source, target } = association
    return {
      id: association.id, source: source.id, target: target.id, type: "floating",
      sourceHandle: "source-right",
      targetHandle: "target-left",
      selected: selectedConnection === association.id,
      interactionWidth: 40,
      style: { stroke: "var(--primary)", strokeWidth: selectedConnection === association.id ? 2 : 1.5 },
      data: { cards, hasComment: !!association.text?.trim(), onSelect: () => { setMenu(null); setEdgeMenu(null); setSelectedCardId(null); setSelectedConnection(association.id) } },
      ariaLabel: `${items[association.sourceId].title} connected to ${items[association.targetId].title}`,
    }
  }))
  const selected = associations.find(association => association.id === selectedConnection)
  const connectItems = async (sourceId: string, targetId: string, sourceVisualId: string, targetVisualId: string) => {
    if (!onTie || connecting || !items[sourceId] || !items[targetId] || sourceId === targetId || connected(sourceId, targetId) || locallyConnected(localConnections, sourceId, targetId)) return
    setConnecting(true)
    setError("")
    setLocalConnections(previous => [...previous, { sourceId, targetId, sourceVisualId, targetVisualId }])
    try { await onTie(sourceId, targetId, ""); setLocalConnections(previous => previous.filter(connection => connection.sourceId !== sourceId || connection.targetId !== targetId)); setMenu(null) }
    catch { setError("Connection shown only in this map. It could not be saved.") }
    finally { setConnecting(false) }
  }
  const onConnect = (connection: Connection) => {
    setLink(null)
    const source = nodes.find(node => node.id === connection.source)
    const target = nodes.find(node => node.id === connection.target)
    if (source?.type === "card" && target?.type === "card") void connectItems(source.data.itemId, target.data.itemId, source.id, target.id)
  }
  const removeConnection = async (association: AssociationView) => {
    setEdgeMenu(null)
    setError("")
    if (!association.associationId) {
      setLocalConnections(previous => previous.filter(connection => `local:${connection.sourceVisualId}:${connection.targetVisualId}` !== association.id))
      setSelectedConnection(undefined)
      return
    }
    if (!onUntie || removing) return
    setRemoving(true)
    try { await onUntie(association.sourceId, association.associationId); setSelectedConnection(undefined) }
    catch { setError("Could not remove this connection. Please try again.") }
    finally { setRemoving(false) }
  }
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
  const candidates = menu?.kind === "item" && items[menu.sourceId]
    ? Object.values(items).filter(item => item.id !== menu.sourceId && !connected(menu.sourceId, item.id) && !locallyConnected(localConnections, menu.sourceId, item.id))
    : []
  const edgeAtPoint = (x: number, y: number) => {
    for (const path of graphRef.current?.querySelectorAll<SVGPathElement>(".react-flow__edge-path") ?? []) {
      const id = path.closest(".react-flow__edge")?.getAttribute("data-id")
      if (!id || !associations.some(association => association.id === id && (association.associationId || association.id.startsWith("local:")))) continue
      const matrix = path.getScreenCTM()
      if (!matrix) continue
      const length = path.getTotalLength()
      for (let offset = 0; offset < length; offset += 12) {
        const start = path.getPointAtLength(offset)
        const end = path.getPointAtLength(Math.min(offset + 12, length))
        const x1 = start.x * matrix.a + start.y * matrix.c + matrix.e
        const y1 = start.x * matrix.b + start.y * matrix.d + matrix.f
        const x2 = end.x * matrix.a + end.y * matrix.c + matrix.e
        const y2 = end.x * matrix.b + end.y * matrix.d + matrix.f
        const dx = x2 - x1
        const dy = y2 - y1
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)))
        if (Math.hypot(x - x1 - t * dx, y - y1 - t * dy) <= 20) return id
      }
    }
  }
  return <div ref={graphRef} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") { setMenu(null); setEdgeMenu(null); cancelLink() } }} onContextMenuCapture={event => {
    if (preview || !onUntie || !graphRef.current || (event.target as Element).closest(".react-flow__node")) return
    const id = edgeAtPoint(event.clientX, event.clientY)
    if (!id) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = graphRef.current.getBoundingClientRect()
    setMenu(null)
    cancelLink()
    setSelectedConnection(id)
    setEdgeMenu({ id, x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 180)), y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 56)) })
  }} onPointerMove={event => {
    if (!link || !graphRef.current) return
    const bounds = graphRef.current.getBoundingClientRect()
    setCursor({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }} className="knowledge-graph relative flex h-full w-full flex-col overflow-hidden rounded-md bg-popover">
    <div className="min-h-0 flex-1">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"} fitView={preview} fitViewOptions={{ padding: 0.1 }} defaultViewport={{ x: 32, y: 32, zoom: 0.85 }} minZoom={0.25} maxZoom={2} nodesDraggable={false} nodesConnectable={!preview && !!onTie} onConnect={onConnect} onClickConnectEnd={() => setLink(null)} onEdgeClick={(_, edge) => { if (!associations.some(association => association.id === edge.id)) return; setMenu(null); setEdgeMenu(null); setSelectedCardId(null); setSelectedConnection(edge.id) }} onNodeClick={(event, node) => {
        setMenu(null)
        setEdgeMenu(null)
        if (node.type !== "card") return
        event.stopPropagation()
        if (link) return
        if (preview || selectedCardId === node.id) onSelectItem(items[node.data.itemId], node.data.trailId)
        else { setSelectedCardId(node.id); setSelectedConnection(undefined) }
      }} onNodeContextMenu={(event, node) => {
        if (preview || !graphRef.current) return
        if (node.type === "card" && !onTie && !onSaveColors) return
        if (node.type === "lane" && (!onSaveColors || !trails.some(trail => trail.id === node.id.slice(5)))) return
        event.preventDefault()
        setEdgeMenu(null)
        const bounds = graphRef.current.getBoundingClientRect()
        cancelLink()
        const x = Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 264))
        const y = Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 172))
        if (node.type === "card") {
          const card = event.currentTarget.getBoundingClientRect()
          setMenu({ kind: "item", sourceId: node.data.itemId, sourceVisualId: node.id, x, y, sourceX: (card.left + card.right) / 2 - bounds.left, sourceY: (card.top + card.bottom) / 2 - bounds.top })
        } else if (node.type === "lane") setMenu({ kind: "trail", trailId: node.id.slice(5), x, y })
      }} onPaneClick={() => { setMenu(null); setEdgeMenu(null); setSelectedCardId(null); cancelLink() }} panOnDrag={!preview && !link} zoomOnScroll={!preview && !link} zoomOnPinch={!preview && !link} zoomOnDoubleClick={!preview && !link} elementsSelectable={!preview} nodesFocusable={!preview} edgesFocusable={!preview} proOptions={preview ? { hideAttribution: true } : undefined}>
        {!preview && <Background color="var(--border)" gap={22} size={1} />}
        {!preview && !link && <Controls position="bottom-right" showInteractive={false} />}
      </ReactFlow>
    </div>
    {link && <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true"><line x1={link.x} y1={link.y} x2={cursor.x} y2={cursor.y} stroke="var(--primary)" strokeWidth="1.5" /></svg>}
    {menu && <div className="absolute z-20 w-64 rounded-md border border-border bg-card p-2 text-sm" style={{ left: menu.x, top: menu.y }} onKeyDown={event => { if (event.key === "Escape") setMenu(null) }}>
      {menu.kind === "item" && onTie && <button type="button" disabled={!candidates.length} onClick={() => { setLink({ sourceId: menu.sourceId, sourceVisualId: menu.sourceVisualId, x: menu.sourceX, y: menu.sourceY }); setCursor({ x: menu.x, y: menu.y }); setMenu(null); graphRef.current?.focus(); requestAnimationFrame(() => sourceHandle(menu.sourceVisualId)?.click()) }} className="w-full rounded-md px-2 py-2 text-left hover:bg-muted disabled:opacity-50">Connect to another note</button>}
      {onSaveColors && <div className={`${menu.kind === "item" && onTie ? "border-t border-border " : ""}px-2 pt-2`}>
        <p className="mb-2 text-xs text-muted-foreground">Background color</p>
        <div className="flex flex-wrap gap-2">{(["", ...GRAPH_COLORS] as const).map(color => <button key={color} type="button" disabled={savingColors} aria-label={`${menu.kind === "item" ? "Note" : "Trail"} background: ${color || "Default"}`} aria-pressed={((menu.kind === "item" ? colors.items[menu.sourceId] : colors.trails[menu.trailId]) ?? "") === color} onClick={() => void setBackground(color)} className="h-7 w-7 rounded-full border border-border aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-50" style={{ background: color ? `color-mix(in srgb, var(--ed-${color}) 24%, var(--card))` : "var(--card)" }} />)}</div>
      </div>}
    </div>}
    {edgeMenu && <div className="absolute z-20 w-44 rounded-md border border-border bg-card p-2 text-sm" style={{ left: edgeMenu.x, top: edgeMenu.y }}>
      <button type="button" disabled={removing || connecting} onClick={() => { const association = associations.find(association => association.id === edgeMenu.id); if (association) void removeConnection(association) }} className="w-full rounded-md px-2 py-2 text-left text-destructive hover:bg-muted disabled:opacity-50">Remove connection</button>
    </div>}
    {!preview && (selected || error) && <div className="shrink-0 border-t border-border px-5 py-3 text-xs text-muted-foreground">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {selected && <div role="status" className="max-h-48 overflow-auto break-words"><p className="mb-2 font-medium text-foreground">{items[selected.sourceId].title} — {items[selected.targetId].title}</p>{onTie && onUpdateAssociation ? <ConnectionComment key={selected.id} items={items} sourceId={selected.sourceId} targetId={selected.targetId} displayText={selected.text} onTie={onTie} onUpdateAssociation={onUpdateAssociation} /> : <p className="whitespace-pre-wrap">{selected.text || (selected.associationId ? "No comment." : "Linked in note.")}</p>}</div>}
    </div>}
  </div>
}
