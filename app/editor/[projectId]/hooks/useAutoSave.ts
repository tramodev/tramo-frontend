// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import { saveItemContent } from '@/lib/item-content-client';
import { isAuthError } from '../../editor-utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveParams {
  projectId?: string;
  restoreEpoch?: number;
  contextId: string | undefined;
  onOptimisticUpdate: (itemId: string, content: string) => void;
  redirectToLogin: () => void;
}


export function useAutoSave({
  projectId,
  restoreEpoch = 0,
  contextId,
  onOptimisticUpdate,
  redirectToLogin,
}: UseAutoSaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const pendingContentRef = useRef(new Map<string, string>());
  const optimisticContentRef = useRef(new Map<string, string>());
  const optimisticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const incompleteImagesRef = useRef(new Set<string>());
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conflictRef = useRef(false);
  const deletedItemsRef = useRef(new Set<string>());
  const pausedItemsRef = useRef(new Set<string>());

  const discardItem = useCallback((itemId: string) => {
    deletedItemsRef.current.add(itemId);
    pendingContentRef.current.delete(itemId);
    optimisticContentRef.current.delete(itemId);
    incompleteImagesRef.current.delete(itemId);
    pausedItemsRef.current.delete(itemId);
  }, []);

  const flushOptimisticContent = useCallback(() => {
    if (optimisticTimeoutRef.current) clearTimeout(optimisticTimeoutRef.current);
    optimisticTimeoutRef.current = null;
    for (const [itemId, content] of optimisticContentRef.current) onOptimisticUpdate(itemId, content);
    optimisticContentRef.current.clear();
  }, [onOptimisticUpdate]);

  const flushPendingContent = useCallback((): Promise<boolean> => {
    flushOptimisticContent();
    if (conflictRef.current) return Promise.resolve(false);
    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = null;
    }
    if (inFlightRef.current) return inFlightRef.current;
    if (pendingContentRef.current.size === 0) return Promise.resolve(incompleteImagesRef.current.size === 0);
    if (!Array.from(pendingContentRef.current.keys()).some(id => !pausedItemsRef.current.has(id))) return Promise.resolve(false);
    const save = async () => {
      setSaveStatus('saving');
      setSaveError('');
      try {
        while (pendingContentRef.current.size > 0) {
          const pending = Array.from(pendingContentRef.current).find(([id]) => !pausedItemsRef.current.has(id));
          if (!pending) return false;
          const [itemId, content] = pending;
          pendingContentRef.current.delete(itemId);
          try {
            await saveItemContent(itemId, content, restoreEpoch, projectId);
            window.dispatchEvent(new Event('editor-images-saved'));
          } catch (err) {
            console.error(err);
            if (err instanceof Error && (err.name === 'ProjectVersionConflict' || err.name === 'ContentConflict')) conflictRef.current = true;
            if (!deletedItemsRef.current.has(itemId) && !pendingContentRef.current.has(itemId)) {
              pendingContentRef.current.set(itemId, content);
            }
            setSaveStatus('error');
            setSaveError(err instanceof Error ? err.message : 'Could not save note content.');
            if (isAuthError(err)) redirectToLogin();
            return false;
          }
        }
        setSaveStatus(incompleteImagesRef.current.size > 0 ? 'saving' : 'saved');
        return incompleteImagesRef.current.size === 0;
      } finally {
        inFlightRef.current = null;
      }
    };
    inFlightRef.current = save();
    return inFlightRef.current;
  }, [flushOptimisticContent, redirectToLogin, restoreEpoch, projectId]);

  useEffect(() => {
    return () => { void flushPendingContent(); };
  }, [contextId, flushPendingContent]);

  useEffect(() => {
    const retry = () => { void flushPendingContent(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [flushPendingContent]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingContentRef.current.size === 0 && !inFlightRef.current && incompleteImagesRef.current.size === 0) return;
      flushPendingContent();
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushPendingContent]);

  const onChange = useCallback((itemId: string, editorState: EditorState) => {
    editorState.read(() => {
      if (deletedItemsRef.current.has(itemId)) return;
      const json = JSON.stringify(editorState.toJSON());
      setSaveStatus('saving');
      optimisticContentRef.current.set(itemId, json);
      if (!optimisticTimeoutRef.current) optimisticTimeoutRef.current = setTimeout(flushOptimisticContent, 150);
      if (json.includes('"imageId":""')) {
        incompleteImagesRef.current.add(itemId);
        pendingContentRef.current.delete(itemId);
        return;
      }
      incompleteImagesRef.current.delete(itemId);

      pendingContentRef.current.set(itemId, json);
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = setTimeout(() => flushPendingContent(), 600);
    });
  }, [flushOptimisticContent, flushPendingContent]);

  const pauseItem = (id: string) => { pausedItemsRef.current.add(id); };
  const resumeItem = (id: string) => {
    pausedItemsRef.current.delete(id);
    if (pendingContentRef.current.size > 0) saveContentTimeoutRef.current = setTimeout(() => { void flushPendingContent(); }, 600);
  };
  const acceptPersistedItem = (id: string) => {
    pendingContentRef.current.delete(id);
    optimisticContentRef.current.delete(id);
    incompleteImagesRef.current.delete(id);
    setSaveStatus(pendingContentRef.current.size > 0 || inFlightRef.current || incompleteImagesRef.current.size > 0 ? 'saving' : 'saved');
  };
  const renameItemId = useCallback((oldId: string, newId: string) => {
    if (oldId === newId) return;
    flushOptimisticContent();
    for (const ref of [pendingContentRef, optimisticContentRef]) {
      const content = ref.current.get(oldId);
      if (content !== undefined) { ref.current.delete(oldId); ref.current.set(newId, content); }
    }
    if (pausedItemsRef.current.has(oldId)) { pausedItemsRef.current.delete(oldId); pausedItemsRef.current.add(newId); }
    if (incompleteImagesRef.current.has(oldId)) { incompleteImagesRef.current.delete(oldId); incompleteImagesRef.current.add(newId); }
  }, [flushOptimisticContent]);
  return { saveStatus, saveError, onChange, discardItem, flushPendingContent, pauseItem, resumeItem, acceptPersistedItem, renameItemId };
}
