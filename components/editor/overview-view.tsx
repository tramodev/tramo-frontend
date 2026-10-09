// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { X } from 'lucide-react';
import { OverviewReader } from '@/components/editor/overview-reader';
import { Trail, Item } from '@/app/editor/types';
import type { MapPreviews } from '@/lib/projects-store';

interface OverviewViewProps {
  trails: Trail[];
  activeTrailId: string | undefined;
  items: Record<string, Item>;
  mapPreviews?: MapPreviews | null;
  selectedItemId: string | undefined;
  onSelectItem: (item: Item, trailId?: string) => void;
  onSetDescription?: (trailId: string, description: string) => void;
  onClose: () => void;
  emptyState: React.ReactNode;
}

export function OverviewView({
  trails,
  activeTrailId,
  items,
  mapPreviews,
  selectedItemId,
  onSelectItem,
  onSetDescription,
  onClose,
  emptyState,
}: OverviewViewProps) {
  if (!trails.length) {
    return emptyState;
  }
  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        title="Close overview"
        className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-elevation-1 hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <OverviewReader
        trails={trails}
        activeTrailId={activeTrailId}
        items={items}
        mapPreviews={mapPreviews}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onSetDescription={onSetDescription}
      />
    </div>
  );
}
