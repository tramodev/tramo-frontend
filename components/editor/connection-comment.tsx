"use client"

import { useRef, useState } from 'react';
import type { Item } from '@/app/editor/types';
import { CONNECTION_TEXT_LIMIT } from '@/app/editor/associations';

interface ConnectionCommentProps {
  items: Record<string, Item>;
  sourceId: string;
  targetId: string;
  displayText?: string | null;
  onTie: (sourceId: string, targetId: string, text: string) => Promise<void>;
  onUpdateAssociation: (itemId: string, associationId: string, text: string) => Promise<void>;
}

export function ConnectionComment({ items, sourceId, targetId, displayText, onTie, onUpdateAssociation }: ConnectionCommentProps) {
  const existing = items[sourceId]?.associations.find(association => association.targetId === targetId)
    ?? items[targetId]?.associations.find(association => association.targetId === sourceId);
  const ownerId = items[sourceId]?.associations.some(association => association.id === existing?.id) ? sourceId : targetId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const save = async () => {
    if (busy.current || (!existing && !draft.trim())) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      if (existing) await onUpdateAssociation(ownerId, existing.id, draft.trim());
      else await onTie(sourceId, targetId, draft.trim());
      setEditing(false);
    } catch {
      setError('Could not save the connection comment. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return <div className="space-y-2 text-sm">
    {(displayText ?? existing?.text) && !editing && <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-foreground">{displayText ?? existing?.text}</p>}
    {editing ? <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-2">
      <textarea autoFocus aria-label="Connection comment" value={draft} maxLength={CONNECTION_TEXT_LIMIT} rows={4} onChange={event => setDraft(event.target.value)} className="w-full resize-y rounded-md border border-input bg-background px-2 py-2 text-sm" />
      <div className="flex items-center gap-3 text-xs">
        <button type="submit" disabled={pending || (!existing && !draft.trim())} className="text-primary disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
        <button type="button" disabled={pending} onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
        <span className="ml-auto text-muted-foreground">{draft.length}/{CONNECTION_TEXT_LIMIT}</span>
      </div>
    </form> : <button type="button" onClick={() => { setDraft(existing?.text ?? ''); setError(''); setEditing(true); }} className="text-primary">{existing?.text ? 'Edit connection comment' : 'Add connection comment'}</button>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
