// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from 'react';
import { CircleHelp, Network, PanelRightOpen, X } from 'lucide-react';
import { Item, Trail, AssociationType, AssociationTargetType } from '@/app/editor/types';
import { ASSOCIATION_META, ASSOCIATION_TYPES, relationshipLabel } from '@/app/editor/associations';
import { KnowledgeGraph } from '@/components/editor/knowledge-graph';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { startEditorTour } from '@/app/editor/[projectId]/hooks/useEditorTour';

interface ConnectionsPanelProps {
  item: Item;
  items: Record<string, Item>;
  trails: Trail[];
  activeTrailId?: string;
  onSelectItem: (item: Item) => void;
  onSelectTrail: (trailId: string) => void;
  onTie: (itemId: string, targetId: string, targetType: AssociationTargetType, type: AssociationType) => void | Promise<void>;
  onUntie: (itemId: string, targetId: string, targetType: AssociationTargetType) => void | Promise<void>;
  onOpenGraph: () => void;
  open: boolean;
  onToggleOpen: () => void;
}

export function ConnectionsPanel({ item, items, trails, activeTrailId, onSelectItem, onSelectTrail, onTie, onUntie, onOpenGraph, open, onToggleOpen }: ConnectionsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [type, setType] = useState<AssociationType>('RELATED');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const utilities = <div className={`mt-auto flex shrink-0 flex-col gap-2 ${open ? 'border-t border-border pt-3' : 'items-center pt-2'}`}>
    <ShortcutsDialog compact={!open} />
    <button type="button" aria-label="Help" title="Help" onClick={startEditorTour} className="flex items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
      <CircleHelp className="h-4 w-4" />{open && <span>Help</span>}
    </button>
  </div>;
  if (!open) return <aside id="editor-connections" aria-label="Connections tools" className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-2xl bg-popover py-3">
    <button type="button" data-tour="connections-toggle" aria-label="Connections" title="Connections" aria-expanded={false} onClick={onToggleOpen} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelRightOpen className="h-4 w-4" /></button>
    <button type="button" aria-label="Open graph" title="Open graph" onClick={onOpenGraph} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Network className="h-4 w-4" /></button>
    {utilities}
  </aside>;
  const incoming = Object.values(items).flatMap(source => source.associations.filter(a => a.targetType === 'ITEM' && a.targetId === item.id).map(a => ({ source, association: a })));
  const tied = new Set(item.associations.map(a => `${a.targetType}:${a.targetId}`));
  const matches = (title: string) => title.toLowerCase().includes(query.trim().toLowerCase());
  const candidates = [
    ...Object.values(items).filter(note => note.id !== item.id).map(note => ({ value: `ITEM:${note.id}`, title: note.title, kind: 'Note' })),
    ...trails.map(trail => ({ value: `TRAIL:${trail.id}`, title: trail.title, kind: 'Trail' })),
  ].filter(candidate => !tied.has(candidate.value) && matches(candidate.title));
  const run = async (action: () => void | Promise<void>) => {
    if (pending) return;
    setPending(true);
    setError('');
    try { await action(); } catch { setError('Could not update this connection. Please try again.'); }
    finally { setPending(false); }
  };
  return <aside id="editor-connections" aria-label="Connections" className="absolute inset-y-0 right-0 z-20 flex w-72 max-w-full flex-col gap-4 overflow-auto rounded-2xl border border-border bg-popover p-4 shadow-elevation-2 md:static md:shrink-0 md:shadow-none">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-medium">Connections</h2><button type="button" aria-label="Close connections" onClick={onToggleOpen} className="rounded p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
    <p className="text-xs text-muted-foreground">Relationships involving “{item.title}”.</p>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {item.associations.map(a => {
      const destination = a.targetType === 'ITEM' ? items[a.targetId] : trails.find(t => t.id === a.targetId);
      return <div key={a.id} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
        <button type="button" disabled={!destination} className="flex-1 text-left hover:text-primary disabled:text-muted-foreground" onClick={() => a.targetType === 'TRAIL' ? onSelectTrail(a.targetId) : items[a.targetId] && onSelectItem(items[a.targetId])}>{relationshipLabel(a.type, item.title, destination?.title ?? a.targetTitle)}</button>
        <button type="button" disabled={pending} aria-label={`Remove connection to ${a.targetTitle}`} onClick={() => run(() => onUntie(item.id, a.targetId, a.targetType))} className="rounded p-1 hover:bg-muted"><X className="h-3 w-3" /></button>
      </div>;
    })}
    {incoming.map(({ source, association }) => <div key={association.id} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
      <button type="button" className="flex-1 text-left hover:text-primary" onClick={() => onSelectItem(source)}>{relationshipLabel(association.type, source.title, item.title, true)}</button>
      <button type="button" disabled={pending} aria-label={`Remove connection from ${source.title}`} onClick={() => run(() => onUntie(source.id, item.id, 'ITEM'))} className="rounded p-1 hover:bg-muted"><X className="h-3 w-3" /></button>
    </div>)}
    {!item.associations.length && !incoming.length && <p className="text-xs text-muted-foreground">No connections yet. Add one when it helps explain how notes relate.</p>}
    {!adding ? <button type="button" onClick={() => setAdding(true)} className="rounded-full border border-input px-3 py-2 text-sm">Connect notes</button> : <form className="flex flex-col gap-3" onSubmit={event => {
      event.preventDefault();
      if (!target || !candidates.some(candidate => candidate.value === target)) return;
      const [targetType, targetId] = target.split(':') as [AssociationTargetType, string];
      void run(async () => { await onTie(item.id, targetId, targetType, type); setAdding(false); setTarget(''); setType('RELATED'); setQuery(''); });
    }}>
      <label className="text-xs">Find a note or trail<input type="search" value={query} onChange={event => { setQuery(event.target.value); setTarget(''); }} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm" placeholder="Search by name" /></label>
      <label className="text-xs">Connect to<select aria-label="Connect to" required value={target} onChange={event => setTarget(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"><option value="">Choose a destination</option>{candidates.map(candidate => <option key={candidate.value} value={candidate.value}>{candidate.title} · {candidate.kind}</option>)}</select></label>
      {!candidates.length && <p className="text-xs text-muted-foreground">No matching destinations.</p>}
      <details><summary className="cursor-pointer text-xs text-muted-foreground">Advanced: relationship type</summary><label className="mt-2 block text-xs">Relationship<select aria-label="Relationship" value={type} onChange={event => setType(event.target.value as AssociationType)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm">{ASSOCIATION_TYPES.map(value => <option key={value} value={value}>{ASSOCIATION_META[value].label}</option>)}</select></label></details>
      <div className="flex gap-2"><button disabled={pending || !target} className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50">{pending ? 'Connecting…' : 'Connect'}</button><button type="button" onClick={() => setAdding(false)} className="px-3 text-xs">Cancel</button></div>
    </form>}
    <div className="border-t border-border pt-3"><button type="button" onClick={onOpenGraph} className="mb-3 text-sm text-primary">Open graph</button><div className="h-44 overflow-hidden rounded-lg border border-border"><KnowledgeGraph trails={trails} items={items} activeTrailId={activeTrailId} selectedItemId={item.id} onSelectItem={onSelectItem} variant="preview" /></div></div>
    {utilities}
  </aside>;
}
