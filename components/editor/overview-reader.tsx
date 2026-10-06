// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Association, Item, Trail } from "@/app/editor/types"
import { bridgeTies } from "@/app/editor/associations"
import { TrailConnector } from "@/components/editor/trail-connector"

interface OverviewReaderProps {
  trail: Trail;
  items: Record<string, Item>;
  associationById: Map<string, Association>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
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

export function OverviewReader({ trail, items, associationById, selectedItemId, onSelectItem, onSetDescription }: OverviewReaderProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-2xl bg-popover">
      <div className="mx-auto max-w-[640px] px-5 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          A trail through the Memex
        </p>
        <h1 className="mt-1 font-display text-[40px] font-medium leading-[1.08]">{trail.title}</h1>
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
          {trail.steps.map((step, i) => {
            const item = items[step.itemId];
            if (!item) return null;
            const ties = i > 0 ? bridgeTies(items, trail.steps[i - 1].itemId, step.itemId) : [];
            const explicit = step.associationId ? associationById.get(step.associationId) : undefined;
            if (explicit && !ties.some((t) => t.association.id === explicit.id)) {
              ties.unshift({ association: explicit, forward: true, sourceTitle: Object.values(items).find(note => note.associations.some(a => a.id === explicit.id))?.title });
            }
            const on = step.itemId === selectedItemId;

            return (
              <div key={step.itemId}>
                {i > 0 && <TrailConnector ties={ties} annotation={step.annotation} />}
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={`w-full rounded-lg border px-4 py-3.5 text-left transition-colors ${
                    on ? "border-primary bg-muted/50" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Step {i + 1}
                  </span>
                  <span className="mt-0.5 block font-display text-[22px] font-medium leading-tight">{item.title}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
