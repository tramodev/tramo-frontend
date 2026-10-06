// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { X } from 'lucide-react';
import { KnowledgeGraph } from '@/components/editor/knowledge-graph';
import { Trail, Item } from '@/app/editor/types';

interface GraphViewProps {
  trails: Trail[];
  items: Record<string, Item>;
  activeTrailId: string | undefined;
  selectedItemId: string | undefined;
  onSelectItem: (item: Item) => void;
  onClose: () => void;
}

export function GraphView({ trails, items, activeTrailId, selectedItemId, onSelectItem, onClose }: GraphViewProps) {
  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onClose}
        title="Close graph"
        className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-elevation-1 hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <KnowledgeGraph
        trails={trails}
        items={items}
        activeTrailId={activeTrailId}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
      />
    </div>
  );
}
