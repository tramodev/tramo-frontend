"use client"

import { ArrowDown } from "lucide-react"

import { Association, Item, Trail } from "@/app/editor/types"
import { ASSOCIATION_META } from "@/app/editor/associations"

interface TrailReaderProps {
  trail: Trail;
  items: Record<string, Item>;
  associationById: Map<string, Association>;
  selectedItemId?: string;
  onSelectItem: (item: Item) => void;
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
export function TrailReader({ trail, items, associationById, selectedItemId, onSelectItem }: TrailReaderProps) {
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

        <div className="mt-8 flex flex-col">
          {trail.steps.map((step, i) => {
            const item = items[step.itemId];
            if (!item) return null;
            const assoc = step.associationId ? associationById.get(step.associationId) : undefined;
            const meta = assoc ? ASSOCIATION_META[assoc.type] : null;
            const BridgeIcon = meta?.Icon ?? ArrowDown;
            const on = step.itemId === selectedItemId;

            return (
              <div key={step.itemId}>
                {i > 0 && (
                  <div className="flex gap-3 py-4 pl-1">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-px bg-border" />
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border text-foreground">
                        <BridgeIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="mt-1 h-3 w-px bg-border" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className={`text-[11px] font-medium uppercase tracking-[0.1em] ${assoc ? "text-foreground" : "text-muted-foreground"}`}>
                        {meta?.label ?? "deliberate jump"}
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
