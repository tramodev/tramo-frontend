"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ListTree, Plus, Square, X } from "lucide-react"

import { Item, Trail, AssociationType, AssociationTargetType } from "@/app/editor/types"
import { ASSOCIATION_META, ASSOCIATION_TYPES } from "@/app/editor/associations"

interface ConnectionsPanelProps {
  item: Item;
  items: Record<string, Item>;
  trails: Trail[];
  onSelectItem: (item: Item) => void;
  onTie: (itemId: string, targetId: string, targetType: AssociationTargetType, type: AssociationType) => void;
  onUntie: (itemId: string, targetId: string, targetType: AssociationTargetType) => void;
  onOpenGraph: () => void;
  open: boolean;
  onToggleOpen: () => void;
}

const MAX_GRAPH_NODES_PER_SIDE = 3;

const SECTION_LABEL_CLASSES = "text-xs font-medium text-muted-foreground";

function truncateLabel(title: string): string {
  return title.length > 14 ? `${title.slice(0, 13)}…` : title;
}

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
}

function layoutArc(count: number, startDeg: number, endDeg: number, cx: number, cy: number, radius: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    positions.push({ x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) });
  }
  return positions;
}

function NeighborhoodGraph({ item, items, trails }: { item: Item; items: Record<string, Item>; trails: Trail[] }) {
  const linked: GraphNode[] = item.linkedItemIds
    .map((id) => items[id])
    .filter((linkedItem): linkedItem is Item => Boolean(linkedItem))
    .slice(0, MAX_GRAPH_NODES_PER_SIDE)
    .map((linkedItem) => ({ id: linkedItem.id, title: linkedItem.title, x: 0, y: 0 }));

  const siblingIds = new Set<string>();
  for (const trail of trails) {
    if (!trail.itemIds.includes(item.id)) continue;
    for (const siblingId of trail.itemIds) {
      if (siblingId === item.id) continue;
      if (item.linkedItemIds.includes(siblingId)) continue;
      siblingIds.add(siblingId);
    }
  }
  const siblings: GraphNode[] = Array.from(siblingIds)
    .map((id) => items[id])
    .filter((siblingItem): siblingItem is Item => Boolean(siblingItem))
    .slice(0, MAX_GRAPH_NODES_PER_SIDE)
    .map((siblingItem) => ({ id: siblingItem.id, title: siblingItem.title, x: 0, y: 0 }));

  const cx = 122;
  const cy = 78;
  const linkedPositions = layoutArc(linked.length, 45, 135, cx, cy, 56);
  const siblingPositions = layoutArc(siblings.length, -135, -45, cx, cy, 50);

  linked.forEach((node, i) => {
    node.x = linkedPositions[i].x;
    node.y = linkedPositions[i].y;
  });
  siblings.forEach((node, i) => {
    node.x = siblingPositions[i].x;
    node.y = siblingPositions[i].y;
  });

  return (
    <svg width="244" height="170" viewBox="0 0 244 170" className="block">
      {siblings.map((node) => (
        <line
          key={`edge-sibling-${node.id}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
      ))}
      {linked.map((node) => (
        <line
          key={`edge-linked-${node.id}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      ))}
      {siblings.map((node) => (
        <circle
          key={`node-sibling-${node.id}`}
          cx={node.x}
          cy={node.y}
          r={5}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
        />
      ))}
      {linked.map((node) => (
        <circle
          key={`node-linked-${node.id}`}
          cx={node.x}
          cy={node.y}
          r={6}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      ))}
      <circle cx={cx} cy={cy} r={8} fill="var(--primary)" />
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">
        this item
      </text>
      {siblings.map((node) => (
        <text
          key={`label-sibling-${node.id}`}
          x={node.x}
          y={node.y + (node.y < cy ? -10 : 20)}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted-foreground)"
        >
          {truncateLabel(node.title)}
        </text>
      ))}
      {linked.map((node) => (
        <text
          key={`label-linked-${node.id}`}
          x={node.x}
          y={node.y + (node.y < cy ? -10 : 20)}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted-foreground)"
        >
          {truncateLabel(node.title)}
        </text>
      ))}
    </svg>
  );
}

export function ConnectionsPanel({
  item,
  items,
  trails,
  onSelectItem,
  onTie,
  onUntie,
  onOpenGraph,
  open,
  onToggleOpen,
}: ConnectionsPanelProps) {
  const [isAddingTie, setIsAddingTie] = useState(false);
  const [tieType, setTieType] = useState<AssociationType>("RELATED");
  const [tieTarget, setTieTarget] = useState(""); // encoded "ITEM:id" | "TRAIL:id"

  // Targets already tied, so we don't offer duplicates.
  const tiedKeys = new Set(item.associations.map((a) => `${a.targetType}:${a.targetId}`));
  const tieableItems = Object.values(items).filter(
    (other) => other.id !== item.id && !tiedKeys.has(`ITEM:${other.id}`)
  );
  const tieableTrails = trails.filter((trail) => !tiedKeys.has(`TRAIL:${trail.id}`));

  const submitTie = () => {
    if (!tieTarget) return;
    const [targetType, targetId] = tieTarget.split(":") as [AssociationTargetType, string];
    onTie(item.id, targetId, targetType, tieType);
    setIsAddingTie(false);
    setTieTarget("");
    setTieType("RELATED");
  };

  return (
    <div
      className={`flex w-72 shrink-0 flex-col transition-all duration-200 ease-linear ${
        open ? "overflow-hidden rounded-2xl sidebar py-5 px-4" : "pt-5 px-4"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        {open && <span className={`truncate ${SECTION_LABEL_CLASSES}`}>Ties from “{item.title}”</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {open && (
            <button
              type="button"
              aria-label="Tie a new association"
              onClick={() => setIsAddingTie(true)}
              className="cursor-pointer"
            >
              <Plus className="h-[15px] w-[15px]" />
            </button>
          )}
          <button
            type="button"
            aria-label={open ? "Collapse connections panel" : "Expand connections panel"}
            onClick={onToggleOpen}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {open ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="overflow-hidden">
        <div
          className={`flex flex-col gap-[22px] transition-transform duration-200 ease-linear ${
            open ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
          aria-hidden={!open}
        >
      <div>
        <div className="flex flex-col gap-2">
          {item.associations.map((a) => {
            const meta = ASSOCIATION_META[a.type];
            const TypeIcon = meta.Icon;
            const isTrail = a.targetType === "TRAIL";
            const targetItem = !isTrail ? items[a.targetId] : undefined;
            return (
              <div
                key={`${a.targetType}:${a.targetId}`}
                className="group/tie flex flex-col gap-1.5 rounded-sm border border-border bg-popover py-2 px-2.5 transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-foreground">
                  <TypeIcon className="h-3 w-3" />
                  <span>{meta.label}</span>
                  <button
                    type="button"
                    aria-label="Remove tie"
                    className="ml-auto shrink-0 cursor-pointer opacity-0 hover:opacity-70 group-hover/tie:opacity-100"
                    onClick={() => onUntie(item.id, a.targetId, a.targetType)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!targetItem}
                  onClick={() => targetItem && onSelectItem(targetItem)}
                  className="flex min-w-0 items-center gap-2 text-left enabled:cursor-pointer disabled:cursor-default"
                >
                  {isTrail ? <ListTree className="h-[13px] w-[13px] shrink-0 text-muted-foreground" /> : <Square className="h-[13px] w-[13px] shrink-0 text-muted-foreground" />}
                  <span className="truncate text-[13.5px] font-medium">{a.targetTitle}</span>
                  <span className="ml-auto shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[8.5px] text-secondary-foreground">
                    {isTrail ? "trail" : "item"}
                  </span>
                </button>
              </div>
            );
          })}
          {item.associations.length === 0 && !isAddingTie && (
            <span className="text-xs italic text-muted-foreground">None yet</span>
          )}
          {isAddingTie && (
            <div className="flex flex-col gap-1 rounded-sm border border-border p-2">
              <select
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={tieType}
                onChange={(e) => setTieType(e.target.value as AssociationType)}
              >
                {ASSOCIATION_TYPES.map((t) => (
                  <option key={t} value={t}>{ASSOCIATION_META[t].label}</option>
                ))}
              </select>
              <select
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={tieTarget}
                onChange={(e) => setTieTarget(e.target.value)}
              >
                <option value="" disabled>Choose a target…</option>
                {tieableItems.length > 0 && (
                  <optgroup label="Items">
                    {tieableItems.map((other) => (
                      <option key={`ITEM:${other.id}`} value={`ITEM:${other.id}`}>{other.title}</option>
                    ))}
                  </optgroup>
                )}
                {tieableTrails.length > 0 && (
                  <optgroup label="Trails">
                    {tieableTrails.map((trail) => (
                      <option key={`TRAIL:${trail.id}`} value={`TRAIL:${trail.id}`}>{trail.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="h-7 flex-1 rounded-md bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  disabled={!tieTarget}
                  onClick={submitTie}
                >
                  Tie
                </button>
                <button type="button" className="h-7 px-2 text-xs" onClick={() => setIsAddingTie(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className={SECTION_LABEL_CLASSES}>Graph preview</span>
          <button
            type="button"
            onClick={onOpenGraph}
            className="cursor-pointer text-[11px] font-medium text-primary"
          >
            Open graph
          </button>
        </div>
        <NeighborhoodGraph item={item} items={items} trails={trails} />
      </div>
        </div>
      </div>
    </div>
  );
}
