"use client"

import { useState } from "react"
import { ArrowDown, Plus } from "lucide-react"

import { Association, Item, Trail } from "@/app/editor/types"
import { ASSOCIATION_META, ASSOCIATION_COLOR_VAR, bridgeTie } from "@/app/editor/associations"

interface TrailReaderProps {
  trail: Trail;
  items: Record<string, Item>;
  associationById: Map<string, Association>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
  onSetDescription: (trailId: string, description: string) => void;
}

// Optional trail description under the header; click to edit, blur/Esc to close.
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

// Pull a short plain-text excerpt out of a Lexical content JSON blob.
function excerpt(content: string | null): string {
  if (!content) return "";
  try {
    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const record = node as { text?: unknown; children?: unknown };
      if (typeof record.text === "string") texts.push(record.text);
      if (Array.isArray(record.children)) record.children.forEach(walk);
    };
    walk((JSON.parse(content) as { root?: unknown }).root);
    const joined = texts.join(" ").trim();
    return joined.length > 180 ? `${joined.slice(0, 179)}…` : joined;
  } catch {
    return "";
  }
}

// Read the active trail as a narrated sequence: each step (past the first) is
// prefaced by a "bridge" — the typed association + the human annotation that
// connects it to the previous step.
export function TrailReader({ trail, items, associationById, selectedItemId, onSelectItem, onSetDescription }: TrailReaderProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-2xl bg-popover">
      <div className="mx-auto max-w-[640px] px-5 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          A trail through the Memex
        </p>
        <h1 className="mt-1 font-display text-[40px] font-medium leading-[1.08]">{trail.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {trail.forkedFrom && <span className="italic">forked · </span>}
          version {trail.version} · {trail.itemIds.length} items
        </p>
        <TrailDescriptionEditor key={trail.id} trailId={trail.id} description={trail.description} onSave={onSetDescription} />


        <div className="mt-8 flex flex-col">
          {trail.steps.map((step, i) => {
            const item = items[step.itemId];
            if (!item) return null;
            // Explicit associationId wins; else fall back to the item's own tie
            // instead of showing "deliberate jump".
            const conn = step.associationId
              ? associationById.get(step.associationId) ?? null
              : i > 0 ? bridgeTie(items, trail.steps[i - 1].itemId, step.itemId) : null;
            const meta = conn ? ASSOCIATION_META[conn.type] : null;
            const BridgeIcon = meta?.Icon ?? ArrowDown;
            // Same colour language as the graph edges when there's a tie.
            const color = conn ? `var(${ASSOCIATION_COLOR_VAR[conn.type]})` : undefined;
            const on = step.itemId === selectedItemId;

            return (
              <div key={step.itemId}>
                {i > 0 && (
                  <div className="flex gap-3 py-4 pl-1">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-px bg-border" style={{ backgroundColor: color }} />
                      <span
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border text-foreground"
                        style={{ borderColor: color, color }}
                      >
                        <BridgeIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="mt-1 h-3 w-px bg-border" style={{ backgroundColor: color }} />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p
                        className={`text-[11px] font-medium uppercase tracking-[0.1em] ${conn ? "text-foreground" : "text-muted-foreground"}`}
                        style={{ color }}
                      >
                        {meta ? `${meta.label} ${conn?.targetTitle ?? ""}`.trim() : "deliberate jump"}
                      </p>
                      {step.annotation?.trim() && (
                        <p className="mt-1 text-[15px] italic leading-relaxed text-foreground/90">{step.annotation}</p>
                      )}
                    </div>
                  </div>
                )}
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
                  {excerpt(item.content) && (
                    <span className="mt-1 block text-sm text-muted-foreground">{excerpt(item.content)}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
