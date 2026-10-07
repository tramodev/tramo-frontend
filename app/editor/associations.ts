// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { ArrowUp, Plus, X, Lightbulb, Waypoints, type LucideIcon } from "lucide-react";
import { Association, AssociationType, Item } from "./types";

export const ASSOCIATION_META: Record<AssociationType, { label: string; Icon: LucideIcon }> = {
  REQUIRES: { label: "requires", Icon: ArrowUp },
  ELABORATES: { label: "elaborates", Icon: Plus },
  CONTRADICTS: { label: "contradicts", Icon: X },
  EXAMPLE_OF: { label: "example of", Icon: Lightbulb },
  RELATED: { label: "related", Icon: Waypoints },
};

export function relationshipLabel(type: AssociationType, source: string, target: string, incoming = false): string {
  const verbs: Record<AssociationType, [string, string]> = {
    REQUIRES: ['requires', 'is required by'],
    ELABORATES: ['elaborates on', 'is elaborated on by'],
    CONTRADICTS: ['contradicts', 'contradicts'],
    EXAMPLE_OF: ['is an example of', 'has an example in'],
    RELATED: ['is related to', 'is related to'],
  };
  return incoming ? `${target} ${verbs[type][1]} ${source}` : `${source} ${verbs[type][0]} ${target}`;
}

export const ASSOCIATION_TYPES = Object.keys(ASSOCIATION_META) as AssociationType[];

export const ASSOCIATION_COLOR_VAR: Record<AssociationType, string> = {
  REQUIRES: "--ed-blue",
  ELABORATES: "--ed-purple",
  CONTRADICTS: "--ed-red",
  EXAMPLE_OF: "--ed-green",
  RELATED: "--ed-orange",
};

export interface BridgeTie {
  association: Association;
  forward: boolean;
  sourceTitle?: string;
}

export function bridgeTies(
  items: Record<string, Item>,
  prevItemId: string,
  itemId: string,
): BridgeTie[] {
  const ties: BridgeTie[] = [];
  const forward = (items[itemId]?.associations ?? []).find(
    (a) => a.targetType === "ITEM" && a.targetId === prevItemId,
  );
  if (forward) ties.push({ association: { ...forward, targetTitle: items[prevItemId]?.title ?? forward.targetTitle }, forward: true, sourceTitle: items[itemId]?.title });
  const backward = (items[prevItemId]?.associations ?? []).find(
    (a) => a.targetType === "ITEM" && a.targetId === itemId,
  );
  if (backward) ties.push({ association: { ...backward, targetTitle: items[itemId]?.title ?? backward.targetTitle }, forward: false, sourceTitle: items[prevItemId]?.title });
  return ties;
}

export function connectionCounts(items: Record<string, Item>): Map<string, number> {
  const counts = new Map(Object.values(items).map(item => [item.id, item.associations.length]));
  for (const source of Object.values(items)) {
    for (const association of source.associations) {
      if (association.targetType === 'ITEM' && counts.has(association.targetId)) {
        counts.set(association.targetId, counts.get(association.targetId)! + 1);
      }
    }
  }
  return counts;
}
