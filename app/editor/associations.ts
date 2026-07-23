import { ArrowUp, Plus, X, Lightbulb, Waypoints, type LucideIcon } from "lucide-react";
import { AssociationType } from "./types";

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
