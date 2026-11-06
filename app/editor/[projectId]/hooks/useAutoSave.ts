import { serializeNoteContent } from '@/app/editor/note-content';
// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import type { CollabStatus } from '../../plugins/CollaborationNotePlugin';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

export function useAutoSave({ onOptimisticUpdate }: { onOptimisticUpdate: (itemId: string, content: string) => void }) {
  const [collabStatuses, setCollabStatuses] = useState<Record<string, CollabStatus>>({});
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

  const setCollabStatus = useCallback((itemId: string, status: CollabStatus | null) => {
    setCollabStatuses(previous => {
      if ((previous[itemId] ?? null) === status) return previous;
      const next = { ...previous };
      if (status) next[itemId] = status;
      else delete next[itemId];
      return next;
    });
  }, []);
  const collabValues = Object.values(collabStatuses);
  const saveStatus: SaveStatus = collabValues.includes('offline') ? 'error' : collabValues.includes('syncing') ? 'saving' : collabValues.length ? 'saved' : 'idle';
  const saveError = saveStatus === 'error' ? 'Offline. Reconnecting; your edits stay in this tab until the connection returns.' : '';
  return { saveStatus, saveError, contentSynced: saveStatus === 'saved' || saveStatus === 'idle', onCollabChange, setCollabStatus };
}
