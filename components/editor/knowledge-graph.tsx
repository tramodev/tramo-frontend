"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Item, Trail, AssociationType } from "@/app/editor/types"
import { ASSOCIATION_META } from "@/app/editor/associations"

interface KnowledgeGraphProps {
  trails: Trail[];
  items: Record<string, Item>;
  activeTrailId?: string;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  // 'preview' = fit-to-container miniature (no controls, non-interactive) for the panel.
  variant?: "full" | "preview";
}

// Association type → the CSS var holding its edge colour. Resolved to a literal
// hex at runtime (var() doesn't resolve inside SVG marker attributes).
const TYPE_VAR: Record<AssociationType, string> = {
  REQUIRES: "--ed-blue",
  ELABORATES: "--ed-purple",
  CONTRADICTS: "--ed-red",
  EXAMPLE_OF: "--ed-green",
  RELATED: "--ed-orange",
};

const FALLBACK: Record<string, string> = {
  "--ed-blue": "#0B57D0",
  "--ed-purple": "#6750A4",
  "--ed-red": "#B3261E",
  "--ed-green": "#1B6E38",
  "--ed-orange": "#9A5B00",
  "--ed-gray": "#5F6368",
  "--popover": "#FFFFFF",
  "--border": "#E4E4E4",
};

// Twitter-blue selection accent — graph-only (the rest of the app stays mono).
const ACCENT = "#1D9BF0";

const NODE_W = 168;
const NODE_H = 52;
const X_GAP = 210;
const MARGIN_X = 60;
const TOP_Y = 150;
const BOTTOM_Y = 380;
const BASE_ARC = 46;
const ARC_STEP = 34;

// ── Custom node: rounded rect with the title inside; spine vs loose distinct ──
type ItemNodeData = { title: string; selected: boolean; kind: "spine" | "loose" };
type ItemNode = Node<ItemNodeData, "item">;

const ItemNodeComp = memo(function ItemNodeComp({ data }: NodeProps<ItemNode>) {
  const spine = data.kind === "spine";
  return (
    <div
      className={`flex items-center justify-center rounded-lg px-3 text-center text-[12.5px] font-medium leading-tight ${
        spine ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
      }`}
      style={{
        width: NODE_W,
        height: NODE_H,
        boxShadow: data.selected ? `0 0 0 2px var(--background), 0 0 0 4px ${ACCENT}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="ts" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bs" style={{ opacity: 0 }} />
      <span className="pointer-events-none line-clamp-2 font-display">{data.title}</span>
    </div>
  );
});

const nodeTypes = { item: ItemNodeComp };

// ── Custom edge: arc height scales with jump span; label only on hover/focus ──
type AssocEdgeData = { label: string; color: string; incident: boolean; span: number };

const AssocEdge = memo(function AssocEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const d = data as AssocEdgeData;
  const sameRow = Math.abs(sourceY - targetY) < 20;

  let path: string;
  let labelX: number;
  let labelY: number;
  if (sameRow) {
    // Arc over the spine; taller for longer jumps so parallel arcs nest.
    const apexY = Math.min(sourceY, targetY) - (BASE_ARC + Math.max(d.span - 1, 0) * ARC_STEP);
    path = `M ${sourceX} ${sourceY} C ${sourceX} ${apexY}, ${targetX} ${apexY}, ${targetX} ${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = apexY + 6;
  } else {
    const [p, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    path = p;
    labelX = lx;
    labelY = ly;
  }

  const showLabel = d.incident || hovered;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: d.color, strokeWidth: d.incident || hovered ? 3 : 1.75 }}
      />
      {/* Wide invisible hit area for hover */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: "stroke" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: d.color,
              background: "var(--popover)",
            }}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

const edgeTypes = { assoc: AssocEdge };

interface Pos { x: number; y: number }
interface Assoc { from: string; to: string; type: AssociationType }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, onSelectItem, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview";
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the CSS custom properties to literal hex (edges/markers).
  const [colors, setColors] = useState<Record<string, string>>(FALLBACK);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Defer a frame: on a theme flip next-themes swaps .dark after our effect,
    // so an immediate read would resolve the *old* colours.
    const raf = requestAnimationFrame(() => {
      const style = getComputedStyle(el);
      const next: Record<string, string> = {};
      for (const name of Object.keys(FALLBACK)) {
        next[name] = style.getPropertyValue(name).trim() || FALLBACK[name];
      }
      setColors(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme]);

  const typeColor = (type: AssociationType) => colors[TYPE_VAR[type]] ?? FALLBACK[TYPE_VAR[type]];
  const spineColor = colors["--ed-gray"] ?? FALLBACK["--ed-gray"];

  const layout = useMemo(() => {
    const activeTrail = trails.find((t) => t.id === activeTrailId) ?? trails[0];
    const spineIds = (activeTrail?.itemIds ?? Object.keys(items)).filter((id) => items[id]);
    const spineSet = new Set(spineIds);
    const col = new Map<string, number>(); // column index (for arc span)
    spineIds.forEach((id, i) => col.set(id, i));

    const pos = new Map<string, Pos>();
    const kind = new Map<string, "spine" | "loose">();
    spineIds.forEach((id, i) => {
      pos.set(id, { x: MARGIN_X + NODE_W / 2 + i * X_GAP, y: TOP_Y });
      kind.set(id, "spine");
    });

    const assocs: Assoc[] = [];
    let offCount = 0;
    for (const id of spineIds) {
      for (const a of items[id].associations) {
        if (a.targetType !== "ITEM" || !items[a.targetId]) continue;
        assocs.push({ from: id, to: a.targetId, type: a.type });
        if (!spineSet.has(a.targetId) && !pos.has(a.targetId)) {
          pos.set(a.targetId, { x: MARGIN_X + NODE_W / 2 + offCount * X_GAP, y: BOTTOM_Y });
          kind.set(a.targetId, "loose");
          col.set(a.targetId, offCount);
          offCount++;
        }
      }
    }

    const spineEdges = spineIds.slice(0, -1).map((from, i) => ({ from, to: spineIds[i + 1] }));
    const typesPresent = (Object.keys(TYPE_VAR) as AssociationType[]).filter((t) =>
      assocs.some((a) => a.type === t)
    );
    return { pos, kind, col, assocs, spineEdges, typesPresent };
  }, [trails, items, activeTrailId]);

  const { pos, kind, col, assocs, spineEdges, typesPresent } = layout;

  const nodes: ItemNode[] = useMemo(
    () =>
      [...pos.entries()].map(([id, p]) => ({
        id,
        type: "item" as const,
        position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
        data: { title: items[id]?.title ?? "", selected: id === selectedItemId, kind: kind.get(id) ?? "spine" },
        draggable: false,
      })),
    [pos, kind, items, selectedItemId]
  );

  const edges: Edge[] = useMemo(() => {
    const incident = (from: string, to: string) => from === selectedItemId || to === selectedItemId;
    const es: Edge[] = [];
    for (const { from, to } of spineEdges) {
      es.push({
        id: `spine-${from}-${to}`,
        source: from,
        target: to,
        sourceHandle: "r",
        targetHandle: "l",
        style: { stroke: spineColor, strokeWidth: incident(from, to) ? 4.25 : 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: spineColor, width: 18, height: 18 },
      });
    }
    assocs.forEach(({ from, to, type }, i) => {
      const color = typeColor(type);
      const sameRow = pos.get(from)!.y === pos.get(to)!.y;
      const span = Math.abs((col.get(to) ?? 0) - (col.get(from) ?? 0));
      es.push({
        id: `assoc-${from}-${to}-${i}`,
        source: from,
        target: to,
        type: "assoc",
        sourceHandle: sameRow ? "ts" : "bs",
        targetHandle: "tt",
        data: { label: ASSOCIATION_META[type].label, color, incident: incident(from, to), span },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      });
    });
    return es;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spineEdges, assocs, pos, col, colors, selectedItemId]);

  const flow = (
    <ReactFlow
      key={activeTrailId ?? "none"}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={preview ? { hideAttribution: true } : undefined}
      onNodeClick={(_, node) => {
        const it = items[node.id];
        if (it) onSelectItem(it);
      }}
      {...(preview
        ? {
            panOnDrag: false,
            zoomOnScroll: false,
            zoomOnPinch: false,
            zoomOnDoubleClick: false,
            elementsSelectable: false,
            nodesFocusable: false,
            edgesFocusable: false,
          }
        : {})}
    >
      {!preview && <Background color={colors["--border"]} gap={22} size={1} />}
      {!preview && <Controls position="bottom-right" showInteractive={false} />}
    </ReactFlow>
  );

  if (preview) {
    return (
      <div ref={containerRef} className="h-full w-full pointer-events-none">
        {flow}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover">
      <div className="min-h-0 flex-1">{flow}</div>

      {/* Legend: trail spine + one entry per association type present */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <svg width="30" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="30" y2="4" stroke={spineColor} strokeWidth={4} />
          </svg>
          orden del trail
        </span>
        {typesPresent.map((type) => (
          <span key={type} className="flex items-center gap-2">
            <svg width="30" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="30" y2="4" stroke={typeColor(type)} strokeWidth={2} />
            </svg>
            {ASSOCIATION_META[type].label}
          </span>
        ))}
        {typesPresent.length === 0 && <span className="italic">no associations yet</span>}
      </div>
    </div>
  );
}
