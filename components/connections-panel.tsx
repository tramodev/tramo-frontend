"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Link2, Plus, X } from "lucide-react"

import { Item, Trail } from "@/app/editor/types"

interface ConnectionsPanelProps {
  item: Item;
  items: Record<string, Item>;
  trails: Trail[];
  onSelectItem: (item: Item) => void;
  onLinkItem: (itemId: string, otherItemId: string) => void;
  onUnlinkItem: (itemId: string, otherItemId: string) => void;
  onLinkTrail: (trailId: string, itemId: string) => void;
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
  onLinkItem,
  onUnlinkItem,
  onLinkTrail,
  onOpenGraph,
  open,
  onToggleOpen,
}: ConnectionsPanelProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemSelection, setItemSelection] = useState("");
  const [isAddingTrail, setIsAddingTrail] = useState(false);
  const [trailSelection, setTrailSelection] = useState("");

  const linkedItems = item.linkedItemIds
    .map((id) => items[id])
    .filter((linked): linked is Item => Boolean(linked));
  const linkableItems = Object.values(items).filter(
    (other) => other.id !== item.id && !item.linkedItemIds.includes(other.id)
  );

  const memberTrails = trails.filter((trail) => trail.itemIds.includes(item.id));
  const linkableTrails = trails.filter((trail) => !trail.itemIds.includes(item.id));

  const submitLinkItem = () => {
    if (!itemSelection) return;
    onLinkItem(item.id, itemSelection);
    setIsAddingItem(false);
    setItemSelection("");
  };

  const submitLinkTrail = () => {
    if (!trailSelection) return;
    onLinkTrail(trailSelection, item.id);
    setIsAddingTrail(false);
    setTrailSelection("");
  };

  return (
    <div
      className={`flex w-72 shrink-0 flex-col transition-all duration-200 ease-linear ${
        open ? "overflow-hidden rounded-2xl bg-card py-5 px-4" : "pt-5 px-4"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        {open && <span className={SECTION_LABEL_CLASSES}>Linked items</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {open && (
            <button
              type="button"
              aria-label="Link an item"
              onClick={() => setIsAddingItem(true)}
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
          {linkedItems.map((linked) => (
            <div
              key={linked.id}
              className="group/linked flex items-center gap-2 rounded-sm border border-border bg-popover py-[9px] px-2.5 transition-colors hover:border-primary"
            >
              <button
                type="button"
                onClick={() => onSelectItem(linked)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
              >
                <Link2 className="h-[13px] w-[13px] shrink-0 text-primary" />
                <span className="truncate text-[13px] font-medium">{linked.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Unlink ${linked.title}`}
                className="shrink-0 cursor-pointer opacity-0 hover:opacity-70 group-hover/linked:opacity-100"
                onClick={() => onUnlinkItem(item.id, linked.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {linkedItems.length === 0 && !isAddingItem && (
            <span className="text-xs italic text-muted-foreground">
              None yet
            </span>
          )}
          {isAddingItem && (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 flex-1 rounded-md border border-input bg-background px-1 text-xs"
                value={itemSelection}
                onChange={(e) => setItemSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose an item...
                </option>
                {linkableItems.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-7 px-2 text-xs font-semibold disabled:opacity-40"
                disabled={!itemSelection}
                onClick={submitLinkItem}
              >
                Link
              </button>
              <button type="button" className="h-7 px-2 text-xs" onClick={() => setIsAddingItem(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className={`mb-2.5 ${SECTION_LABEL_CLASSES}`}>
          In trails
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {memberTrails.map((trail) => (
            <span
              key={trail.id}
              className="rounded-sm text-[11px] font-medium bg-secondary text-secondary-foreground py-1 px-2.5"
            >
              {trail.title}
            </span>
          ))}
          {isAddingTrail ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={trailSelection}
                onChange={(e) => setTrailSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose a trail...
                </option>
                {linkableTrails.map((trail) => (
                  <option key={trail.id} value={trail.id}>
                    {trail.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-7 px-2 text-xs font-semibold disabled:opacity-40"
                disabled={!trailSelection}
                onClick={submitLinkTrail}
              >
                Link
              </button>
              <button type="button" className="h-7 px-2 text-xs" onClick={() => setIsAddingTrail(false)}>
                Cancel
              </button>
            </div>
          ) : (
            linkableTrails.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddingTrail(true)}
                className="flex items-center gap-1 rounded-sm border border-dashed border-input py-1 px-2.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-2.5 w-2.5" />
                Add
              </button>
            )
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
