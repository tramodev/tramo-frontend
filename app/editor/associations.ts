import { ArrowUp, Plus, X, Lightbulb, Waypoints, type LucideIcon } from "lucide-react";
import { Association, AssociationType, Item } from "./types";

// Shared per-type metadata for typed associations (ties). Used by the Write
// annotation banner, the Trail reader bridges, the Connections panel and the
// Graph legend so a "requires"/"elaborates"/… reads the same everywhere.
export const ASSOCIATION_META: Record<AssociationType, { label: string; Icon: LucideIcon }> = {
  REQUIRES: { label: "requires", Icon: ArrowUp },
  ELABORATES: { label: "elaborates", Icon: Plus },
  CONTRADICTS: { label: "contradicts", Icon: X },
  EXAMPLE_OF: { label: "example of", Icon: Lightbulb },
  RELATED: { label: "related", Icon: Waypoints },
};

export const ASSOCIATION_TYPES = Object.keys(ASSOCIATION_META) as AssociationType[];

// Per-type edge colour, as the CSS var name (same palette as the graph).
export const ASSOCIATION_COLOR_VAR: Record<AssociationType, string> = {
  REQUIRES: "--ed-blue",
  ELABORATES: "--ed-purple",
  CONTRADICTS: "--ed-red",
  EXAMPLE_OF: "--ed-green",
  RELATED: "--ed-orange",
};

// The connection to label a trail bridge when the step has no explicit
// associationId: the item's own outgoing tie — preferring one that points at
// the previous step — instead of showing "deliberate jump". Returns the full
// association (type + targetTitle) or null.
export function bridgeTie(
  items: Record<string, Item>,
  prevItemId: string,
  itemId: string,
): Association | null {
  const own = items[itemId]?.associations ?? [];
  return (
    own.find((a) => a.targetType === "ITEM" && a.targetId === prevItemId) ??
    own[0] ??
    null
  );
}
