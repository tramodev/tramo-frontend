// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import { Item, Trail } from "@/app/editor/types"
import { itemIdsFromContent } from "@/app/editor/plugins/itemLink"
import { TrailConnector } from "@/components/editor/trail-connector"
import type { MapPreviews } from "@/lib/projects-store"

interface OverviewReaderProps {
  trails: Trail[];
  activeTrailId?: string;
  items: Record<string, Item>;
  mapPreviews?: MapPreviews | null;
  selectedItemId?: string;
  onSelectItem: (item: Item, trailId?: string) => void;
  onSetDescription?: (trailId: string, description: string) => void;
}

function TrailDescriptionEditor({ trailId, description, onSave }: { trailId: string; description: string; onSave: (trailId: string, description: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const save = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== description) onSave(trailId, next);
  };
  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(description); setEditing(false); }
        }}
        rows={2}
        placeholder="Describe this trail…"
        className="mt-3 w-full resize-none rounded-sm border border-input bg-background px-2 py-1.5 text-[15px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }
  if (!description.trim()) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mt-3 flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Add description
      </button>
    );
  }
  return (
    <p onClick={() => setEditing(true)} className="mt-3 cursor-text whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">
      {description}
    </p>
  );
}

export function OverviewReader({ trails, activeTrailId, items, mapPreviews, selectedItemId, onSelectItem, onSetDescription }: OverviewReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = activeRef.current?.offsetTop ?? 0;
  }, [activeTrailId]);

  return (
    <div ref={scrollRef} className="relative flex-1 overflow-y-auto rounded-2xl bg-popover">
      {trails.map(trail => <section key={trail.id} ref={trail.id === activeTrailId ? activeRef : undefined} className="border-b border-border last:border-b-0">
      <div className="mx-auto max-w-[640px] px-5 py-10">
        <h1 className="font-display text-[40px] font-medium leading-[1.08]">{trail.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {trail.forkedFrom && <span className="italic">forked · </span>}
          version {trail.version} · {trail.itemIds.length} notes
        </p>
        {onSetDescription ? (
          <TrailDescriptionEditor key={trail.id} trailId={trail.id} description={trail.description} onSave={onSetDescription} />
        ) : (
          trail.description.trim() && (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">
              {trail.description}
            </p>
          )
        )}


        <div className="mt-8 flex flex-col">
          {!trail.steps.length && <p className="text-sm text-muted-foreground">No notes in this trail.</p>}
          {trail.steps.map((step, i) => {
            const item = items[step.itemId];
            if (!item) return null;
            const on = step.itemId === selectedItemId && trail.id === activeTrailId;
            const mentioned = (item.content != null ? itemIdsFromContent(item.content) : mapPreviews?.[item.id]?.linkedItemIds ?? [])
              .filter(id => id !== item.id && items[id])
              .map(id => items[id]);

            return (
              <div key={step.itemId}>
                {i > 0 && <TrailConnector />}
                <button
                  type="button"
                  onClick={() => onSelectItem(item, trail.id)}
                  className={`w-full rounded-lg border px-4 py-3.5 text-left transition-colors ${
                    on ? "border-primary bg-muted/50" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Step {i + 1}
                  </span>
                  <span className="mt-0.5 block font-display text-[22px] font-medium leading-tight">{item.title}</span>
                  {!!mentioned.length && <span className="mt-2 block break-words text-xs text-muted-foreground">{mentioned.map(note => `@${note.title}`).join(' · ')}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      </section>)}
    </div>
  );
}
