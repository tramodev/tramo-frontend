import type { Item } from '@/app/editor/types';

export const CONNECTION_TEXT_LIMIT = 2000;

export function connectionCounts(items: Record<string, Item>): Map<string, number> {
  const counts = new Map(Object.values(items).map(item => [item.id, item.associations.length]));
  for (const source of Object.values(items)) {
    for (const association of source.associations) {
      if (counts.has(association.targetId)) {
        counts.set(association.targetId, counts.get(association.targetId)! + 1);
      }
    }
  }
  return counts;
}
