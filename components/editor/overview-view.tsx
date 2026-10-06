// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { X } from 'lucide-react';
import { OverviewReader } from '@/components/editor/overview-reader';
import { Trail, Item, Association } from '@/app/editor/types';

interface OverviewViewProps {
  trail: Trail | undefined;
  items: Record<string, Item>;
  associationById: Map<string, Association>;
  selectedItemId: string | undefined;
  onSelectItem: (item: Item) => void;
  onSetDescription?: (trailId: string, description: string) => void;
  onClose: () => void;
  emptyState: React.ReactNode;
}

export function OverviewView({
  trail,
  items,
  associationById,
  selectedItemId,
  onSelectItem,
  onSetDescription,
  onClose,
  emptyState,
}: OverviewViewProps) {
  if (!trail || trail.itemIds.length === 0) {
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
        trail={trail}
        items={items}
        associationById={associationById}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onSetDescription={onSetDescription}
      />
    </div>
  );
}
