// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { memo, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Item, Trail } from "@/app/editor/types"

interface KnowledgeGraphProps {
  trails: Trail[];
  items: Record<string, Item>;
  activeTrailId?: string;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  variant?: "full" | "preview";
}

const NODE_W = 132;
const NODE_H = 44;
const X_GAP = 210;
const MARGIN_X = 60;
const TOP_Y = 150;
const BOTTOM_Y = 380;
const BASE_ARC = 46;
const ARC_STEP = 34;

type ItemNodeData = { title: string; selected: boolean; kind: "spine" | "loose" };
type ItemNode = Node<ItemNodeData, "item">;

const ItemNodeComp = memo(function ItemNodeComp({ data }: NodeProps<ItemNode>) {
  const spine = data.kind === "spine";
  return (
    <div
      className={`flex items-center justify-center rounded-lg px-2 text-center text-[17.5px] font-medium leading-tight ${
        spine ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
      }`}
      style={{
        width: NODE_W,
        height: NODE_H,
        boxShadow: data.selected ? `0 0 0 2px var(--background), 0 0 0 4px var(--primary)` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="ts" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bs" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bt" style={{ opacity: 0 }} />
      <span className="pointer-events-none line-clamp-2 font-display">{data.title}</span>
    </div>
  );
});

const nodeTypes = { item: ItemNodeComp };

type AssocEdgeData = { incident: boolean; span: number; reverse: boolean };

const AssocEdge = memo(function AssocEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, data, selected }: EdgeProps) {
  const d = data as AssocEdgeData;
  const direction = d.reverse ? 1 : -1;
  const bend = direction * (BASE_ARC + Math.max(d.span - 1, 0) * ARC_STEP);
  const path = Math.abs(sourceY - targetY) < 20
    ? `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + bend}, ${targetX} ${targetY + bend}, ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX + bend} ${targetY}, ${targetX} ${targetY}`;
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24}
    style={{ stroke: 'var(--primary)', strokeWidth: selected ? 4 : d.incident ? 3 : 1.75 }} />;
});

const edgeTypes = { assoc: AssocEdge };

interface Pos { x: number; y: number }
interface Assoc { id: string; from: string; to: string; text: string | null }

export function KnowledgeGraph({ trails, items, activeTrailId, selectedItemId, onSelectItem, variant = "full" }: KnowledgeGraphProps) {
  const preview = variant === "preview";
  const { resolvedTheme } = useTheme();
  const [selectedConnection, setSelectedConnection] = useState<string>();
  const mounted = useMounted();

  const layout = useMemo(() => {
    const activeTrail = trails.find((t) => t.id === activeTrailId) ?? trails[0];
    const trailIds = (activeTrail?.itemIds ?? []).filter((id) => items[id]);
    const hasTrailOrder = trailIds.length > 0;
    const spineIds = hasTrailOrder ? trailIds : Object.keys(items);
    const spineSet = new Set(spineIds);
    const col = new Map<string, number>();
    spineIds.forEach((id, i) => col.set(id, i));

    const pos = new Map<string, Pos>();
    const kind = new Map<string, "spine" | "loose">();
    spineIds.forEach((id, i) => {
      pos.set(id, { x: MARGIN_X + NODE_W / 2 + i * X_GAP, y: TOP_Y });
      kind.set(id, "spine");
    });

    const assocs: Assoc[] = [];
    let offCount = 0;
    const addLoose = (id: string) => {
      if (spineSet.has(id) || pos.has(id)) return;
      pos.set(id, { x: MARGIN_X + NODE_W / 2 + offCount * X_GAP, y: BOTTOM_Y });
      kind.set(id, "loose");
      col.set(id, offCount);
      offCount++;
    };

    const outgoingFrom = [...spineIds];
    if (selectedItemId && items[selectedItemId] && !spineSet.has(selectedItemId)) {
      addLoose(selectedItemId);
      outgoingFrom.push(selectedItemId);
    }

    for (const id of outgoingFrom) {
      for (const a of items[id].associations) {
        if (!items[a.targetId]) continue;
        assocs.push({ id: a.id, from: id, to: a.targetId, text: a.text });
        addLoose(a.targetId);
      }
    }

    const drawn = new Set(outgoingFrom);
    for (const [id, item] of Object.entries(items)) {
      if (drawn.has(id)) continue;
      for (const a of item.associations ?? []) {
        if (!drawn.has(a.targetId)) continue;
        assocs.push({ id: a.id, from: id, to: a.targetId, text: a.text });
        addLoose(id);
      }
    }

    const spineEdges = hasTrailOrder
      ? spineIds.slice(0, -1).map((from, i) => ({ from, to: spineIds[i + 1] }))
      : [];
    return { pos, kind, col, assocs, spineEdges, rootPos: pos.get(spineIds[0]) };
  }, [trails, items, activeTrailId, selectedItemId]);

  const { pos, kind, col, assocs, spineEdges, rootPos } = layout;

  const nodes: ItemNode[] = useMemo(() => {
    const looseXs = [...pos.entries()].filter(([id]) => kind.get(id) === "loose").map(([, p]) => p.x);
    const shiftX =
      preview && rootPos && looseXs.length
        ? rootPos.x - (Math.min(...looseXs) + Math.max(...looseXs)) / 2
        : 0;
    return [...pos.entries()].map(([id, p]) => {
      const x = kind.get(id) === "loose" ? p.x + shiftX : p.x;
      return {
        id,
        type: "item" as const,
        position: { x: x - NODE_W / 2, y: p.y - NODE_H / 2 },
        data: { title: items[id]?.title ?? "", selected: id === selectedItemId, kind: kind.get(id) ?? "spine" },
        draggable: false,
      };
    });
  }, [pos, kind, items, selectedItemId, preview, rootPos]);

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
        style: { stroke: "var(--muted-foreground)", strokeWidth: 2, strokeDasharray: "6 5" },
        selectable: false,
        focusable: false,
      });
    }
    assocs.forEach(({ id, from, to }) => {
      const color = "var(--primary)";
      const reverse = from.localeCompare(to, "en", { numeric: true }) > 0;
      const sameRow = pos.get(from)!.y === pos.get(to)!.y;
      const sourceBelow = pos.get(from)!.y > pos.get(to)!.y;
      const span = Math.abs((col.get(to) ?? 0) - (col.get(from) ?? 0));
      es.push({
        id: `assoc-${id}`,
        source: from,
        target: to,
        type: "assoc",
        sourceHandle: sameRow ? (reverse ? "bs" : "ts") : sourceBelow ? "ts" : "bs",
        targetHandle: sameRow ? (reverse ? "bt" : "tt") : sourceBelow ? "bt" : "tt",
        data: { incident: incident(from, to), span, reverse },
        selected: selectedConnection === id,
        ariaLabel: `${items[from].title} → ${items[to].title}`,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      });
    });
    return es;
  }, [spineEdges, assocs, pos, col, selectedItemId, selectedConnection, items]);

  const previewKey = useMemo(
    () => [activeTrailId ?? "none", ...nodes.map((n) => n.id), ...edges.map((e) => e.id)].join("|"),
    [activeTrailId, nodes, edges],
  );

  const flow = (
    <ReactFlow
      key={preview ? previewKey : activeTrailId ?? "none"}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"}
      fitView
      fitViewOptions={{ padding: preview ? 0.05 : 0.2 }}
      minZoom={0.2}
      maxZoom={preview ? 4 : 2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={preview ? { hideAttribution: true } : undefined}
      onEdgeClick={(_, edge) => { if (edge.id.startsWith("assoc-")) setSelectedConnection(edge.id.slice(6)); }}
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
      {!preview && <Background color="var(--border)" gap={22} size={1} />}
      {!preview && <Controls position="bottom-right" showInteractive={false} />}
    </ReactFlow>
  );

  if (preview) {
    return (
      <div className="h-full w-full pointer-events-none">
        {flow}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover">
      <div className="min-h-0 flex-1">{flow}</div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <svg width="30" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="30" y2="4" stroke="var(--muted-foreground)" strokeDasharray="6 5" strokeWidth={4} />
          </svg>
          Trail order
        </span>
        <span>→ Connection</span>
        <label className="flex items-center gap-2">Connection
          <select value={selectedConnection ?? ''} onChange={event => setSelectedConnection(event.target.value || undefined)} className="max-w-full rounded border border-input bg-background p-2">
            <option value="">Select a connection</option>
            {assocs.map(a => <option key={a.id} value={a.id}>{items[a.from].title} → {items[a.to].title}</option>)}
          </select>
        </label>
        {assocs.filter(a => a.id === selectedConnection).map(a => <p key={a.id} className="max-h-40 w-full overflow-auto whitespace-pre-wrap break-words" role="status">{items[a.from].title} → {items[a.to].title}{'\n'}{a.text || 'No explanation.'}</p>)}
      </div>
    </div>
  );
}
