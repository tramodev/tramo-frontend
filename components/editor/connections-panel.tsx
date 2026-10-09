"use client"

import { useMemo, useRef, useState } from 'react';
import { CircleHelp, Network, PanelRightOpen, X } from 'lucide-react';
import type { Item, Trail } from '@/app/editor/types';
import type { MapPreviews } from '@/lib/projects-store';
import { CONNECTION_TEXT_LIMIT } from '@/app/editor/associations';
import { itemIdsFromContent } from '@/app/editor/plugins/itemLink';
import { KnowledgeGraph } from '@/components/editor/knowledge-graph';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { startEditorTour } from '@/app/editor/[projectId]/hooks/useEditorTour';

interface ConnectionsPanelProps {
  item: Item;
  items: Record<string, Item>;
  trails: Trail[];
  mapPreviews?: MapPreviews | null;
  onRetryMapPreviews?: () => void;
  graphColors?: string | null;
  activeTrailId?: string;
  onSelectItem: (item: Item) => void;
  onUntie: (itemId: string, associationId: string) => Promise<void>;
  onUpdateAssociation: (itemId: string, associationId: string, text: string) => Promise<void>;
  onOpenGraph: () => void;
  open: boolean;
  onToggleOpen: () => void;
}

type Draft = { sourceId: string; targetId: string; text: string; associationId: string };

export function ConnectionsPanel({ item, items, trails, mapPreviews, onRetryMapPreviews, graphColors, activeTrailId, onSelectItem, onUntie, onUpdateAssociation, onOpenGraph, open, onToggleOpen }: ConnectionsPanelProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const references = useMemo(() => Object.fromEntries(Object.values(items).map(note => [note.id, note.content != null ? itemIdsFromContent(note.content) : mapPreviews?.[note.id]?.linkedItemIds ?? []])), [items, mapPreviews]);
  const mentioned = Object.values(items).filter(note => note.id !== item.id && !item.associations.some(association => association.targetId === note.id) && (references[item.id]?.includes(note.id) || references[note.id]?.includes(item.id)));
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try { await action(); }
    catch { setError('Could not update this connection. Please try again.'); }
    finally { busy.current = false; setPending(false); }
  };
  const utilities = <div className={`mt-auto flex shrink-0 items-center justify-center gap-2 ${open ? 'border-t border-border pt-3' : 'flex-col pt-2'}`}>
    <ShortcutsDialog compact={!open} />
    <button type="button" aria-label="Help" title="Help" onClick={startEditorTour} className="flex items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
      <CircleHelp className="h-4 w-4" />{open && <span>Help</span>}
    </button>
  </div>;
  if (!open) return <aside id="editor-connections" aria-label="Connections tools" className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-2xl bg-popover py-3">
    <button type="button" data-tour="connections-toggle" aria-label="Connections" title="Connections" aria-expanded={false} onClick={onToggleOpen} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelRightOpen className="h-4 w-4" /></button>
    <button type="button" aria-label="Open map" title="Open map" onClick={onOpenGraph} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Network className="h-4 w-4" /></button>
    {utilities}
  </aside>;
  const source = draft ? items[draft.sourceId] : undefined;
  const count = item.associations.length + mentioned.length;
  return <aside id="editor-connections" aria-label="Connections" className="absolute inset-y-0 right-0 z-20 flex w-72 max-w-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-popover p-4 shadow-elevation-2 md:static md:shrink-0 md:shadow-none">
    <div className="flex shrink-0 items-center justify-between gap-2"><h2 className="text-sm font-medium">Connections ({count})</h2><button type="button" aria-label="Close connections" onClick={onToggleOpen} className="rounded p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
    <section className="min-h-0 flex-1 space-y-2 overflow-y-auto">
      {!count && <p className="text-xs text-muted-foreground">Use @ to connect notes.</p>}
      {!!count && <p className="text-xs text-muted-foreground">Connections involving “{item.title}”.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {item.associations.map((association) => {
        const target = items[association.targetId];
        return <div key={association.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <button type="button" disabled={!target} className="text-left hover:text-primary" onClick={() => target && onSelectItem(target)}>{item.title} — {target?.title ?? association.targetTitle}</button>
          {association.text && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{association.text}</p>}
          <div className="flex gap-3 text-xs">
            <button type="button" disabled={pending || !!draft} className="text-primary disabled:opacity-50" onClick={() => { setError(''); setDraft({ sourceId: item.id, targetId: association.targetId, text: association.text ?? '', associationId: association.id }); }}>Edit explanation</button>
            <button type="button" disabled={pending || !!draft} className="text-destructive disabled:opacity-50" aria-label={`Remove connection between ${item.title} and ${target?.title ?? association.targetTitle}`} onClick={() => void run(() => onUntie(item.id, association.id))}>Remove</button>
          </div>
        </div>;
      })}
      {mentioned.map(note => {
        const outgoing = references[item.id]?.includes(note.id);
        return <div key={`mention:${note.id}`} className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <button type="button" className="text-left hover:text-primary" onClick={() => onSelectItem(note)}>{outgoing ? `${item.title} — ${note.title}` : `${note.title} — ${item.title}`}</button>
          <p className="text-xs text-muted-foreground">@ mention in {outgoing ? item.title : note.title}</p>
        </div>;
      })}
      {draft && <form className="flex flex-col gap-3" onSubmit={event => {
      event.preventDefault();
      if (!source) return;
      void run(async () => {
        await onUpdateAssociation(draft.sourceId, draft.associationId, draft.text);
        setDraft(null);
      });
    }}>
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3">
        <p className="text-sm">{source?.title ?? 'Deleted note'} — {items[draft.targetId]?.title ?? 'Deleted note'}</p>
        <label className="text-xs">Explanation (optional)<textarea value={draft.text} maxLength={CONNECTION_TEXT_LIMIT} rows={4} onChange={event => setDraft({ ...draft, text: event.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm" /><span className="text-muted-foreground">{draft.text.length}/{CONNECTION_TEXT_LIMIT}</span></label>
        <div className="flex gap-2"><button disabled={!source} className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => { setDraft(null); setError(''); }} className="px-3 text-xs">Cancel</button></div>
      </fieldset>
      </form>}
    </section>
    <div className="flex h-40 shrink-0 flex-col border-t border-border pt-2"><button type="button" onClick={onOpenGraph} className="mb-1 self-start text-sm text-primary">Open map</button><div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">{mapPreviews === undefined ? <div role="status" className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading map…</div> : mapPreviews === null ? <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 text-xs text-destructive">Map preview could not load. <button type="button" className="text-primary underline" onClick={onRetryMapPreviews}>Retry</button></div> : <KnowledgeGraph trails={trails} items={items} mapPreviews={mapPreviews} graphColors={graphColors} activeTrailId={activeTrailId} selectedItemId={item.id} onSelectItem={onSelectItem} variant="preview" />}</div></div>
    {utilities}
  </aside>;
}
