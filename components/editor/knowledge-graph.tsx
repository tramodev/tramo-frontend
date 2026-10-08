"use client"

import { memo, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, type Node, type Edge, type NodeProps, type Connection, type NodeChange } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { Item, Trail } from "@/app/editor/types"
import { collectPlainText } from "@/app/editor/editor-utils"

interface KnowledgeGraphProps {
  trails: Trail[]
  items: Record<string, Item>
  activeTrailId?: string
  selectedItemId?: string
  onSelectItem: (item: Item, trailId?: string) => void
  onTie?: (itemId: string, targetId: string, text: string) => Promise<void>
  onUntie?: (itemId: string, associationId: string) => Promise<void>
  variant?: "full" | "preview"
}

type CardData = { itemId: string; trailId?: string; title: string; preview: string; number: number; selected: boolean; shared: boolean; connectRole?: "source" | "target" }
type CardNode = Node<CardData, "card">
type LaneNode = Node<{ title: string }, "lane">
type GraphNode = CardNode | LaneNode

type Appearance = { id: string; itemId: string; trailId?: string; column: number; row: number }
type AssociationView = { id: string; associationId?: string; sourceId: string; targetId: string; text: string | null; source: Appearance; target: Appearance }
type LocalConnection = { sourceId: string; targetId: string; sourceVisualId: string; targetVisualId: string }

const COLUMN_WIDTH = 420
const COLUMN_GAP = 90
function previewText(content: string | null) {
  if (!content) return ""
  try {
    const blocks = (JSON.parse(content) as { root?: { children?: unknown[] } }).root?.children
    if (!Array.isArray(blocks)) return ""
    const paragraphs: string[] = []
    for (const block of blocks) {
      const text = collectPlainText(JSON.stringify({ root: block })).join("").trim()
      if (text) paragraphs.push(text)
      if (paragraphs.length === 2) break
    }
    return paragraphs.join("\n\n")
  }
  catch { return "" }
}

const Card = memo(function Card({ data }: NodeProps<CardNode>) {
  return <div className={`relative min-h-[132px] w-[420px] rounded-md border bg-card p-4 ${data.selected ? "border-primary" : "border-border"}`}>
    <Handle id="target-top" type="target" position={Position.Top} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-bottom" type="source" position={Position.Bottom} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-left" type="target" position={Position.Left} className="!h-5 !w-5 !opacity-0" />
    <Handle id="source-right" type="source" position={Position.Right} className="!h-5 !w-5 !opacity-0" />
    <Handle id="target-right" type="target" position={Position.Right} className="!pointer-events-none !opacity-0" />
    <Handle id="source-left" type="source" position={Position.Left} className="!pointer-events-none !opacity-0" />
    <Handle id="target-bottom" type="target" position={Position.Bottom} className="!pointer-events-none !opacity-0" />
    <Handle id="source-top" type="source" position={Position.Top} className="!pointer-events-none !opacity-0" />
    <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><span>Note {data.number}</span>{data.shared && <span>Shared</span>}</div>
    <div className="mt-2 break-words font-display text-lg font-medium leading-tight text-foreground">{data.title}</div>
    <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{data.preview || "No preview available"}</div>
    {data.connectRole && <Handle id={`easy-${data.connectRole}`} type={data.connectRole} position={data.connectRole === "source" ? Position.Right : Position.Left} className={`easy-connect-${data.connectRole} !absolute !left-0 !top-0 !h-full !w-full !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-transparent !opacity-0`} isConnectableStart={data.connectRole === "source"} isConnectableEnd={data.connectRole === "target"} />}
  </div>
})

const Lane = memo(function Lane({ data }: NodeProps<LaneNode>) {
  return <div className="relative h-full w-full text-foreground"><div className="absolute inset-x-0 bottom-0 top-14 rounded-md border border-border bg-muted/20" /><div className="absolute left-4 right-4 top-2 truncate font-display text-xl font-medium">{data.title}</div></div>
})

const nodeTypes = { card: Card, lane: Lane }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, onSelectItem, onTie, onUntie, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview"
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const [selectedConnection, setSelectedConnection] = useState<string>()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<{ sourceId: string; sourceVisualId: string; x: number; y: number; sourceX: number; sourceY: number } | null>(null)
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

  const { nodes, associations } = useMemo(() => {
    const columns = trails.map(trail => ({ title: trail.title, trailId: trail.id, ids: trail.itemIds.filter(id => items[id]) }))
    const filed = new Set(columns.flatMap(column => column.ids))
    const loose = Object.keys(items).filter(id => !filed.has(id))
    if (loose.length) columns.push({ title: "Notes without a trail", trailId: "", ids: loose })
    const counts = new Map<string, number>()
    columns.forEach(column => column.ids.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1)))
    const appearances = new Map<string, Appearance[]>()
    const nodes: GraphNode[] = []
    columns.forEach((column, columnIndex) => {
      const x = columnIndex * (COLUMN_WIDTH + COLUMN_GAP)
      let y = 84
      column.ids.forEach((itemId, row) => {
        const item = items[itemId]
        const appearance = { id: `card:${column.trailId || "loose"}:${itemId}`, itemId, trailId: column.trailId || undefined, column: columnIndex, row }
        appearances.set(itemId, [...(appearances.get(itemId) ?? []), appearance])
        nodes.push({ id: appearance.id, type: "card", position: { x: x + 16, y }, data: { itemId, trailId: appearance.trailId, title: item.title, preview: previewText(item.content), number: row + 1, selected: preview ? itemId === selectedItemId && (!activeTrailId || activeTrailId === column.trailId) : selectedCardId === appearance.id, shared: (counts.get(itemId) ?? 0) > 1, connectRole: link?.sourceVisualId === appearance.id ? "source" : link && itemId !== link.sourceId && !items[link.sourceId]?.associations.some(association => association.targetId === itemId) && !localConnections.some(connection => connection.sourceId === link.sourceId && connection.targetId === itemId) ? "target" : undefined }, draggable: false, zIndex: 1 })
        y += (heights[appearance.id] ?? 132) + 40
      })
      nodes.push({ id: `lane:${column.trailId || "loose"}`, type: "lane", position: { x, y: 0 }, data: { title: column.title }, style: { width: COLUMN_WIDTH + 32, height: Math.max(104, y - 16), pointerEvents: "none" }, draggable: false, selectable: false, connectable: false, zIndex: -1 })
    })
    const associations: AssociationView[] = []
    for (const item of Object.values(items)) for (const association of item.associations ?? []) {
      const sources = appearances.get(item.id)
      const targets = appearances.get(association.targetId)
      if (!sources?.length || !targets?.length) continue
      const pairs = sources.flatMap(source => targets.map(target => ({ source, target, distance: Math.abs(source.column - target.column) * 3 + Math.abs(source.row - target.row) })))
      pairs.sort((a, b) => a.distance - b.distance || a.source.column - b.source.column || a.target.column - b.target.column)
      associations.push({ id: `${item.id}:${association.id}`, associationId: association.id, sourceId: item.id, targetId: association.targetId, text: association.text, source: pairs[0].source, target: pairs[0].target })
    }
    for (const connection of localConnections) {
      if (items[connection.sourceId]?.associations.some(association => association.targetId === connection.targetId)) continue
      const source = appearances.get(connection.sourceId)?.find(appearance => appearance.id === connection.sourceVisualId)
      const target = appearances.get(connection.targetId)?.find(appearance => appearance.id === connection.targetVisualId)
      if (source && target) associations.push({ id: `local:${source.id}:${target.id}`, sourceId: connection.sourceId, targetId: connection.targetId, text: null, source, target })
    }
    return { nodes, associations }
  }, [trails, items, selectedItemId, activeTrailId, selectedCardId, preview, heights, link, localConnections])

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

  const edges: Edge[] = associations.map(association => {
    const { source, target } = association
    const sameColumn = source.column === target.column
    const downward = source.row < target.row
    const rightward = source.column < target.column
    return {
      id: association.id, source: source.id, target: target.id, type: "straight",
      sourceHandle: sameColumn ? downward ? "source-bottom" : "source-top" : rightward ? "source-right" : "source-left",
      targetHandle: sameColumn ? downward ? "target-top" : "target-bottom" : rightward ? "target-left" : "target-right",
      markerEnd: { type: MarkerType.Arrow, color: "var(--primary)", width: 16, height: 16, markerUnits: "userSpaceOnUse", strokeWidth: 1.5 },
      selected: selectedConnection === association.id,
      interactionWidth: 40,
      style: { stroke: "var(--primary)", strokeWidth: selectedConnection === association.id ? 2 : 1.5 },
      ariaLabel: `${items[association.sourceId].title} → ${items[association.targetId].title}`,
    }
  })
  const selected = associations.find(association => association.id === selectedConnection)
  const connectItems = async (sourceId: string, targetId: string, sourceVisualId: string, targetVisualId: string) => {
    if (!onTie || connecting || !items[sourceId] || !items[targetId] || sourceId === targetId || items[sourceId].associations.some(a => a.targetId === targetId) || localConnections.some(connection => connection.sourceId === sourceId && connection.targetId === targetId)) return
    setConnecting(true)
    setError("")
    setLocalConnections(previous => [...previous, { sourceId, targetId, sourceVisualId, targetVisualId }])
    try { await onTie(sourceId, targetId, ""); setLocalConnections(previous => previous.filter(connection => connection.sourceId !== sourceId || connection.targetId !== targetId)); setMenu(null) }
    catch { setError("Connection shown only in this graph. It could not be saved.") }
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
  const candidates = menu && items[menu.sourceId]
    ? Object.values(items).filter(item => item.id !== menu.sourceId && !items[menu.sourceId].associations.some(association => association.targetId === item.id) && !localConnections.some(connection => connection.sourceId === menu.sourceId && connection.targetId === item.id))
    : []
  const edgeAtPoint = (x: number, y: number) => {
    for (const path of graphRef.current?.querySelectorAll<SVGPathElement>(".react-flow__edge-path") ?? []) {
      const id = path.closest(".react-flow__edge")?.getAttribute("data-id")
      if (!id || !associations.some(association => association.id === id)) continue
      const matrix = path.getScreenCTM()
      if (!matrix) continue
      const start = path.getPointAtLength(0)
      const end = path.getPointAtLength(path.getTotalLength())
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
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"} fitView={preview} fitViewOptions={{ padding: 0.1 }} defaultViewport={{ x: 32, y: 32, zoom: 0.85 }} minZoom={0.25} maxZoom={2} nodesDraggable={false} nodesConnectable={!preview && !!onTie} onConnect={onConnect} onClickConnectEnd={() => setLink(null)} onEdgeClick={(_, edge) => { setMenu(null); setEdgeMenu(null); setSelectedCardId(null); setSelectedConnection(edge.id) }} onNodeClick={(event, node) => {
        setMenu(null)
        setEdgeMenu(null)
        if (node.type !== "card") return
        event.stopPropagation()
        if (link) return
        if (preview || selectedCardId === node.id) onSelectItem(items[node.data.itemId], node.data.trailId)
        else { setSelectedCardId(node.id); setSelectedConnection(undefined) }
      }} onNodeContextMenu={(event, node) => {
        if (!onTie || node.type !== "card" || !graphRef.current) return
        event.preventDefault()
        setEdgeMenu(null)
        const bounds = graphRef.current.getBoundingClientRect()
        const card = event.currentTarget.getBoundingClientRect()
        cancelLink()
        setMenu({ sourceId: node.data.itemId, sourceVisualId: node.id, x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 264)), y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 70)), sourceX: (card.left + card.right) / 2 - bounds.left, sourceY: (card.top + card.bottom) / 2 - bounds.top })
      }} onPaneClick={() => { setMenu(null); setEdgeMenu(null); setSelectedCardId(null); cancelLink() }} panOnDrag={!preview && !link} zoomOnScroll={!preview && !link} zoomOnPinch={!preview && !link} zoomOnDoubleClick={!preview && !link} elementsSelectable={!preview} nodesFocusable={!preview} edgesFocusable={!preview} proOptions={preview ? { hideAttribution: true } : undefined}>
        {!preview && <Background color="var(--border)" gap={22} size={1} />}
        {!preview && !link && <Controls position="bottom-right" showInteractive={false} />}
      </ReactFlow>
    </div>
    {link && <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true"><defs><marker id="graph-connection-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M 1 1 L 7 4.5 L 1 8" fill="none" stroke="var(--primary)" strokeWidth="1.5" /></marker></defs><line x1={link.x} y1={link.y} x2={cursor.x} y2={cursor.y} stroke="var(--primary)" strokeWidth="1.5" markerEnd="url(#graph-connection-arrow)" /></svg>}
    {menu && <div className="absolute z-20 w-64 rounded-md border border-border bg-card p-2 text-sm" style={{ left: menu.x, top: menu.y }} onKeyDown={event => { if (event.key === "Escape") setMenu(null) }}>
      <button type="button" disabled={!candidates.length} onClick={() => { setLink({ sourceId: menu.sourceId, sourceVisualId: menu.sourceVisualId, x: menu.sourceX, y: menu.sourceY }); setCursor({ x: menu.x, y: menu.y }); setMenu(null); graphRef.current?.focus(); requestAnimationFrame(() => sourceHandle(menu.sourceVisualId)?.click()) }} className="w-full rounded-md px-2 py-2 text-left hover:bg-muted disabled:opacity-50">Connect to another note</button>
    </div>}
    {edgeMenu && <div className="absolute z-20 w-44 rounded-md border border-border bg-card p-2 text-sm" style={{ left: edgeMenu.x, top: edgeMenu.y }}>
      <button type="button" disabled={removing || connecting} onClick={() => { const association = associations.find(association => association.id === edgeMenu.id); if (association) void removeConnection(association) }} className="w-full rounded-md px-2 py-2 text-left text-destructive hover:bg-muted disabled:opacity-50">Remove connection</button>
    </div>}
    {!preview && (selected || error) && <div className="shrink-0 border-t border-border px-5 py-3 text-xs text-muted-foreground">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {selected && <p role="status" className="max-h-32 overflow-auto whitespace-pre-wrap break-words"><span className="font-medium text-foreground">{items[selected.sourceId].title} → {items[selected.targetId].title}</span><span className="mt-1 block">{selected.text || "No explanation."}</span></p>}
    </div>}
  </div>
}
