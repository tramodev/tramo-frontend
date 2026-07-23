"use client"

import { useState } from "react"
import { Plus, Waypoints } from "lucide-react"

import { AssociationType } from "@/app/editor/types"
import { ASSOCIATION_META, ASSOCIATION_COLOR_VAR } from "@/app/editor/associations"

interface AnnotationBannerProps {
  annotation: string | null;
  // The association type by which this item was reached; null = deliberate jump.
  associationType: AssociationType | null;
  // Title of the connected item, when the type comes from a tie (e.g. "example of X").
  connectionTitle?: string | null;
  trailTitle: string;
  onSave: (annotation: string) => void;
}

// Incoming annotation for a trail step (idx > 0) in Write mode. Annotations are
// optional: with none, it's just a quiet "+ Add annotation" link; once present
// (or while editing) it becomes a compact box you can click to edit.
export function AnnotationBanner({ annotation, associationType, connectionTitle, trailTitle, onSave }: AnnotationBannerProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation ?? "");

  const meta = associationType ? ASSOCIATION_META[associationType] : null;
  const Icon = meta?.Icon ?? Waypoints;
  // Left border in the connection's colour when there's a tie (matches the graph/trail).
  const color = associationType ? `var(${ASSOCIATION_COLOR_VAR[associationType]})` : undefined;

  const save = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== (annotation ?? "")) onSave(next);
  };

  const hasAnnotation = !!annotation?.trim();

  // Fully quiet only when there's neither a connection nor an annotation — just
  // an add affordance. If there's a connection (tie), always show it.
  if (!editing && !hasAnnotation && !meta) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add annotation
      </button>
    );
  }

  return (
    <div
      className="rounded-md border border-border border-l-2 border-l-primary bg-muted/40 px-3.5 py-2.5"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        <span>
          {meta
            ? `${meta.label}${connectionTitle ? ` ${connectionTitle}` : ""}`
            : "Arrived via a deliberate jump"}
          {" · in "}{trailTitle}
        </span>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            if (e.key === "Escape") {
              setDraft(annotation ?? "");
              setEditing(false);
            }
          }}
          rows={2}
          placeholder="Write the annotation that bridges the previous step to this one…"
          className="mt-2 w-full resize-none rounded-sm border border-input bg-background px-2 py-1.5 text-[14.5px] italic outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : hasAnnotation ? (
        <p
          onClick={() => setEditing(true)}
          className="mt-1.5 cursor-text text-[14.5px] italic leading-relaxed text-foreground/90"
        >
          {annotation}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add annotation
        </button>
      )}
    </div>
  );
}
