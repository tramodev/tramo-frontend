import { serializeNoteContent } from '@/app/editor/note-content';
// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import type { CollabStatus } from '../../plugins/CollaborationNotePlugin';

export type SaveStatus = 'idle' | 'saving' | 'error' | 'unsaved';
const SLOW_SYNC_MS = 1500;

export function useAutoSave({ onOptimisticUpdate }: { onOptimisticUpdate: (itemId: string, content: string) => void }) {
  const [collabStatuses, setCollabStatuses] = useState<Record<string, CollabStatus>>({});
  const [slowItems, setSlowItems] = useState<ReadonlySet<string>>(() => new Set());
  const slowTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const optimisticContentRef = useRef(new Map<string, string>());
  const optimisticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushOptimisticContent = useCallback(() => {
    if (optimisticTimeoutRef.current) clearTimeout(optimisticTimeoutRef.current);
    optimisticTimeoutRef.current = null;
    for (const [itemId, content] of optimisticContentRef.current) onOptimisticUpdate(itemId, content);
    optimisticContentRef.current.clear();
  }, [onOptimisticUpdate]);

  const onCollabChange = useCallback((itemId: string, editorState: EditorState) => {
    editorState.read(() => {
      optimisticContentRef.current.set(itemId, serializeNoteContent(editorState.toJSON()));
      if (!optimisticTimeoutRef.current) optimisticTimeoutRef.current = setTimeout(flushOptimisticContent, 150);
    });
  }, [flushOptimisticContent]);

  useEffect(() => {
    const timers = slowTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  const setCollabStatus = useCallback((itemId: string, status: CollabStatus | null) => {
    const timers = slowTimers.current;
    if (status === 'syncing') {
      if (!timers.has(itemId)) timers.set(itemId, setTimeout(() => {
        timers.delete(itemId);
        setSlowItems(previous => new Set(previous).add(itemId));
      }, SLOW_SYNC_MS));
    } else {
      clearTimeout(timers.get(itemId));
      timers.delete(itemId);
      setSlowItems(previous => {
        if (!previous.has(itemId)) return previous;
        const next = new Set(previous);
        next.delete(itemId);
        return next;
      });
    }
    setCollabStatuses(previous => {
      if ((previous[itemId] ?? null) === status) return previous;
      const next = { ...previous };
      if (status) next[itemId] = status;
      else delete next[itemId];
      return next;
    });
  }, []);
  const collabValues = Object.values(collabStatuses);
  const offline = collabValues.includes('offline');
  const saveStatus: SaveStatus = offline ? 'error' : slowItems.size ? 'saving' : 'idle';
  const saveError = offline ? 'Offline. Reconnecting; your edits stay in this tab until the connection returns.' : '';
  return { saveStatus, saveError, contentSynced: !offline && !collabValues.includes('syncing'), onCollabChange, setCollabStatus };
}
