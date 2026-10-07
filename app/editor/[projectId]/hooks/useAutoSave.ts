// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import { saveItemContent } from '@/lib/item-content-client';
import { isAuthError } from '../../editor-utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveParams {
  contextId: string | undefined;
  onOptimisticUpdate: (itemId: string, content: string) => void;
  redirectToLogin: () => void;
}


export function useAutoSave({
  contextId,
  onOptimisticUpdate,
  redirectToLogin,
}: UseAutoSaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const pendingContentRef = useRef(new Map<string, string>());
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const incompleteImagesRef = useRef(new Set<string>());
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedItemsRef = useRef(new Set<string>());

  const discardItem = useCallback((itemId: string) => {
    deletedItemsRef.current.add(itemId);
    pendingContentRef.current.delete(itemId);
    incompleteImagesRef.current.delete(itemId);
  }, []);

  const flushPendingContent = useCallback((): Promise<boolean> => {
    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = null;
    }
    if (inFlightRef.current) return inFlightRef.current;
    if (pendingContentRef.current.size === 0) return Promise.resolve(incompleteImagesRef.current.size === 0);
    const save = async () => {
      setSaveStatus('saving');
      try {
        while (pendingContentRef.current.size > 0) {
          const [itemId, content] = pendingContentRef.current.entries().next().value!;
          pendingContentRef.current.delete(itemId);
          try {
            await saveItemContent(itemId, content);
            window.dispatchEvent(new Event('editor-images-saved'));
          } catch (err) {
            console.error(err);
            if (!deletedItemsRef.current.has(itemId) && !pendingContentRef.current.has(itemId)) {
              pendingContentRef.current.set(itemId, content);
            }
            setSaveStatus('error');
            if (isAuthError(err)) redirectToLogin();
            return false;
          }
        }
        setSaveStatus('saved');
        return incompleteImagesRef.current.size === 0;
      } finally {
        inFlightRef.current = null;
      }
    };
    inFlightRef.current = save();
    return inFlightRef.current;
  }, [redirectToLogin]);

  useEffect(() => {
    return () => { void flushPendingContent(); };
  }, [contextId, flushPendingContent]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingContentRef.current.size === 0 && !inFlightRef.current) return;
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
      onOptimisticUpdate(itemId, json);
      if (json.includes('"imageId":""')) {
        incompleteImagesRef.current.add(itemId);
        pendingContentRef.current.delete(itemId);
        return;
      }
      incompleteImagesRef.current.delete(itemId);

      pendingContentRef.current.set(itemId, json);
      setSaveStatus('saving');
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = setTimeout(() => flushPendingContent(), 600);
    });
  }, [flushPendingContent, onOptimisticUpdate]);

  return { saveStatus, onChange, discardItem, flushPendingContent };
}
