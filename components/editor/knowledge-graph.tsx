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
  type Node,
  type Edge,
  type NodeProps,
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

const NODE_R = 28;
const X_GAP = 200;
const MARGIN_X = 70;
const TOP_Y = 130;
const BOTTOM_Y = 340;

function truncate(s: string): string {
  return s.length > 18 ? `${s.slice(0, 17)}…` : s;
}

// ── Custom node: a circle (--primary) with the label below it ────────────────
type ItemNodeData = { title: string; selected: boolean };
type ItemNode = Node<ItemNodeData, "item">;

const ItemNodeComp = memo(function ItemNodeComp({ data }: NodeProps<ItemNode>) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-primary"
      style={{
        width: NODE_R * 2,
        height: NODE_R * 2,
        boxShadow: data.selected ? `0 0 0 2px var(--background), 0 0 0 4px ${ACCENT}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="ts" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bs" style={{ opacity: 0 }} />
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap font-display text-[13px] font-medium text-foreground">
        {data.title}
      </span>
    </div>
  );
});

const nodeTypes = { item: ItemNodeComp };

interface Pos { x: number; y: number }
interface Assoc { from: string; to: string; type: AssociationType }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, onSelectItem, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview";
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the CSS custom properties to literal hex (edges/markers/minimap).
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

    const pos = new Map<string, Pos>();
    spineIds.forEach((id, i) => pos.set(id, { x: MARGIN_X + NODE_R + i * X_GAP, y: TOP_Y }));

    const assocs: Assoc[] = [];
    let offCount = 0;
    for (const id of spineIds) {
      for (const a of items[id].associations) {
        if (a.targetType !== "ITEM" || !items[a.targetId]) continue;
        assocs.push({ from: id, to: a.targetId, type: a.type });
        if (!spineSet.has(a.targetId) && !pos.has(a.targetId)) {
          pos.set(a.targetId, { x: MARGIN_X + NODE_R + offCount * X_GAP, y: BOTTOM_Y });
          offCount++;
        }
      }
    }

    const spineEdges = spineIds.slice(0, -1).map((from, i) => ({ from, to: spineIds[i + 1] }));
    const typesPresent = (Object.keys(TYPE_VAR) as AssociationType[]).filter((t) =>
      assocs.some((a) => a.type === t)
    );
    return { pos, assocs, spineEdges, typesPresent };
  }, [trails, items, activeTrailId]);

  const { pos, assocs, spineEdges, typesPresent } = layout;

  const nodes: ItemNode[] = useMemo(
    () =>
      [...pos.entries()].map(([id, p]) => ({
        id,
        type: "item" as const,
        position: { x: p.x - NODE_R, y: p.y - NODE_R },
        data: { title: truncate(items[id]?.title ?? ""), selected: id === selectedItemId },
        draggable: false,
      })),
    [pos, items, selectedItemId]
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
      es.push({
        id: `assoc-${from}-${to}-${i}`,
        source: from,
        target: to,
        sourceHandle: sameRow ? "ts" : "bs",
        targetHandle: "tt",
        label: ASSOCIATION_META[type].label,
        labelStyle: { fill: color, fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: colors["--popover"] },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 3,
        style: { stroke: color, strokeWidth: incident(from, to) ? 3 : 1.75 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      });
    });
    return es;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spineEdges, assocs, pos, colors, selectedItemId]);

  const flow = (
    <ReactFlow
      key={activeTrailId ?? "none"}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
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
