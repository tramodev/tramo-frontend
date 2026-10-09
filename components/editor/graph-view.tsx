// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { KnowledgeGraph } from '@/components/editor/knowledge-graph';
import { Trail, Item } from '@/app/editor/types';
import { getItemContent, getTrailContents } from '@/lib/item-content-client';

interface GraphViewProps {
  projectId?: string;
  graphColors?: string | null;
  onSaveColors?: (colors: string) => Promise<void>;
  trails: Trail[];
  items: Record<string, Item>;
  activeTrailId: string | undefined;
  selectedItemId: string | undefined;
  onSelectItem: (item: Item, trailId?: string) => void;
  onTie?: (itemId: string, targetId: string, text: string) => Promise<void>;
  onUpdateAssociation?: (itemId: string, associationId: string, text: string) => Promise<void>;
  onUntie?: (itemId: string, associationId: string) => Promise<void>;
  onClose: () => void;
}

export function GraphView({ projectId, graphColors, onSaveColors, trails, items, activeTrailId, selectedItemId, onSelectItem, onTie, onUpdateAssociation, onUntie, onClose }: GraphViewProps) {
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!onTie) return;
    let cancelled = false;
    const filed = new Set(trails.flatMap(trail => trail.itemIds));
    Promise.allSettled([
      ...trails.map(trail => getTrailContents(trail.id)),
      ...Object.keys(items).filter(id => !filed.has(id)).map(async id => ({ [id]: await getItemContent(id) })),
    ]).then(results => {
      if (cancelled) return;
      setContents(Object.assign({}, ...results.filter(result => result.status === 'fulfilled').map(result => result.value)));
      setLoadError(results.some(result => result.status === 'rejected'));
    });
    return () => { cancelled = true; };
  }, [trails, items, onTie]);
  const previewItems = Object.fromEntries(Object.entries(items).map(([id, item]) => [id, { ...item, content: item.content ?? contents[id] ?? null }]));
  return (
    <div className="relative flex-1 overflow-hidden rounded-md">
      {loadError && <p role="alert" className="absolute left-6 top-6 z-10 rounded-md bg-card px-3 py-2 text-xs text-destructive">Some note previews could not load.</p>}
      <button
        type="button"
        onClick={onClose}
        title="Close map"
        className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-card hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <KnowledgeGraph
        key={projectId}
        graphColors={graphColors}
        onSaveColors={onSaveColors}
        trails={trails}
        items={previewItems}
        activeTrailId={activeTrailId}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onTie={onTie}
        onUpdateAssociation={onUpdateAssociation}
        onUntie={onUntie}
      />
    </div>
  );
}
