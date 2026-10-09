// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { X } from 'lucide-react';
import { KnowledgeGraph } from '@/components/editor/knowledge-graph';
import { Trail, Item } from '@/app/editor/types';
import type { MapPreviews } from '@/lib/projects-store';

interface GraphViewProps {
  projectId?: string;
  graphColors?: string | null;
  onSaveColors?: (colors: string) => Promise<void>;
  trails: Trail[];
  items: Record<string, Item>;
  mapPreviews?: MapPreviews | null;
  onRetryMapPreviews?: () => void;
  activeTrailId: string | undefined;
  selectedItemId: string | undefined;
  onSelectItem: (item: Item, trailId?: string) => void;
  onTie?: (itemId: string, targetId: string, text: string) => Promise<void>;
  onUpdateAssociation?: (itemId: string, associationId: string, text: string) => Promise<void>;
  onUntie?: (itemId: string, associationId: string) => Promise<void>;
  onClose: () => void;
}

export function GraphView({ projectId, graphColors, onSaveColors, trails, items, mapPreviews, onRetryMapPreviews, activeTrailId, selectedItemId, onSelectItem, onTie, onUpdateAssociation, onUntie, onClose }: GraphViewProps) {
  return (
    <div className="relative flex-1 overflow-hidden rounded-md">
      <button
        type="button"
        onClick={onClose}
        title="Close map"
        className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-card hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      {mapPreviews === null ? <div role="alert" className="flex h-full items-center justify-center gap-3 text-sm text-destructive">Map preview could not load. <button type="button" className="text-primary underline" onClick={onRetryMapPreviews}>Retry</button></div> : mapPreviews === undefined && onRetryMapPreviews ? <div role="status" className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div> : <KnowledgeGraph
        key={projectId}
        graphColors={graphColors}
        onSaveColors={onSaveColors}
        trails={trails}
        items={items}
        mapPreviews={mapPreviews}
        activeTrailId={activeTrailId}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onTie={onTie}
        onUpdateAssociation={onUpdateAssociation}
        onUntie={onUntie}
      />}
    </div>
  );
}
