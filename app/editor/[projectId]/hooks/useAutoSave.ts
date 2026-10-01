import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import { saveItemContent } from '@/lib/item-content-client';
import { isAuthError } from '../../editor-utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveParams {
  selectedItemId: string | undefined;
  onOptimisticUpdate: (itemId: string, content: string) => void;
  redirectToLogin: () => void;
}


export function useAutoSave({
  selectedItemId,
  onOptimisticUpdate,
  redirectToLogin,
}: UseAutoSaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const pendingContentRef = useRef(new Map<string, string>());
  const inFlightRef = useRef(false);
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedItemContentRef = useRef<string | null>(null);

  const handleContentApplied = useCallback((itemId: string) => {
    loadedItemContentRef.current = itemId;
  }, []);

  const flushPendingContent = useCallback(async () => {
    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = null;
    }
    if (inFlightRef.current || pendingContentRef.current.size === 0) return;
    inFlightRef.current = true;
    setSaveStatus('saving');
    try {
      while (pendingContentRef.current.size > 0) {
        const [itemId, content] = pendingContentRef.current.entries().next().value!;
        pendingContentRef.current.delete(itemId);
        try {
          await saveItemContent(itemId, content);
        } catch (err) {
          console.error(err);
          if (!pendingContentRef.current.has(itemId)) {
            pendingContentRef.current.set(itemId, content);
          }
          setSaveStatus('error');
          if (isAuthError(err)) redirectToLogin();
          return;
        }
      }
      setSaveStatus('saved');
    } finally {
      inFlightRef.current = false;
    }
  }, [redirectToLogin]);

  useEffect(() => {
    return () => { void flushPendingContent(); };
  }, [selectedItemId, flushPendingContent]);

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

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      if (!selectedItemId) return;
      if (loadedItemContentRef.current !== selectedItemId) return;
      const json = JSON.stringify(editorState.toJSON());
      onOptimisticUpdate(selectedItemId, json);
      if (json.includes('"src":"blob:')) return;

      pendingContentRef.current.set(selectedItemId, json);
      setSaveStatus('saving');
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = setTimeout(() => flushPendingContent(), 600);
    });
  }, [selectedItemId, flushPendingContent, onOptimisticUpdate]);

  return { saveStatus, onChange, handleContentApplied };
}
