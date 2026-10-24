// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import { getExtractionEpoch, getSavedItemContent, saveItemContent } from '@/lib/item-content-client';
import { readItemContentBackup, writeItemContentBackup, removeItemContentBackup, type ItemContentBackup } from '@/lib/item-content-backup';
import { isAuthError } from '../../editor-utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveParams {
  userId?: string;
  projectId?: string;
  restoreEpoch?: number;
  contextId: string | undefined;
  onOptimisticUpdate: (itemId: string, content: string) => void;
  redirectToLogin: () => void;
}


export function useAutoSave({
  userId,
  projectId,
  restoreEpoch = 0,
  contextId,
  onOptimisticUpdate,
  redirectToLogin,
}: UseAutoSaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [recoveredConflict, setRecoveredConflict] = useState(false);
  const conflictedBackupsRef = useRef(new Set<string>());
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
    try { if (userId && projectId) removeItemContentBackup(userId, projectId, itemId); } catch {}
  }, [userId, projectId]);

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
            try {
              if (userId && projectId) {
                const backup = readItemContentBackup(userId, projectId, itemId);
                if (backup && backup.content !== content) writeItemContentBackup(userId, projectId, itemId, { ...backup, expectedContent: content });
                else removeItemContentBackup(userId, projectId, itemId, content);
              }
            } catch {}
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
  }, [flushOptimisticContent, redirectToLogin, restoreEpoch, projectId, userId]);

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
      try {
        if (userId && projectId) {
          const previous = readItemContentBackup(userId, projectId, itemId);
          writeItemContentBackup(userId, projectId, itemId, {
            content: JSON.stringify(editorState.toJSON(), (key, value) => key === 'children' && Array.isArray(value)
              ? value.filter(node => node.type !== 'image' || node.imageId) : value), expectedContent: previous?.expectedContent ?? getSavedItemContent(itemId),
            extractionEpoch: previous?.extractionEpoch ?? getExtractionEpoch(itemId), restoreEpoch: previous?.restoreEpoch ?? restoreEpoch,
          });
        }
      } catch { setSaveError('Local backup is unavailable. Keep this tab open until your changes are saved.'); }

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
  }, [flushOptimisticContent, flushPendingContent, userId, projectId, restoreEpoch]);

  const recoverItemContent = useCallback((itemId: string, backup: ItemContentBackup, serverContent: string) => {
    if (backup.restoreEpoch !== restoreEpoch || backup.extractionEpoch !== getExtractionEpoch(itemId)
      || backup.expectedContent !== serverContent) {
      conflictRef.current = true;
      conflictedBackupsRef.current.add(itemId);
      setRecoveredConflict(true);
      setSaveStatus('error');
      setSaveError('Local changes were recovered, but this note changed on the server. Copy your recovered text before choosing the server version; automatic saving is stopped.');
      return;
    }
    pendingContentRef.current.set(itemId, backup.content);
    setSaveStatus('saving');
    if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
    saveContentTimeoutRef.current = setTimeout(() => { void flushPendingContent(); }, 600);
  }, [restoreEpoch, flushPendingContent]);

  const discardRecoveredChanges = () => {
    try {
      if (!userId || !projectId) return;
      for (const itemId of conflictedBackupsRef.current) {
        removeItemContentBackup(userId, projectId, itemId);
        pendingContentRef.current.delete(itemId);
      }
      window.location.reload();
    } catch { setSaveError('Could not discard local changes. Your recovered text is still available.'); }
  };

  const pauseItem = (id: string) => { pausedItemsRef.current.add(id); };
  const resumeItem = (id: string) => {
    pausedItemsRef.current.delete(id);
    if (pendingContentRef.current.size > 0) saveContentTimeoutRef.current = setTimeout(() => { void flushPendingContent(); }, 600);
  };
  const acceptPersistedItem = (id: string) => {
    pendingContentRef.current.delete(id);
    optimisticContentRef.current.delete(id);
    incompleteImagesRef.current.delete(id);
    try { if (userId && projectId) removeItemContentBackup(userId, projectId, id); } catch {}
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
    try {
      if (userId && projectId) {
        const backup = readItemContentBackup(userId, projectId, oldId);
        if (backup) { writeItemContentBackup(userId, projectId, newId, backup); removeItemContentBackup(userId, projectId, oldId); }
      }
    } catch { setSaveError('Local backup is unavailable. Keep this tab open until your changes are saved.'); }
  }, [flushOptimisticContent, userId, projectId]);
  return { saveStatus, saveError, onDiscardRecoveredChanges: recoveredConflict ? discardRecoveredChanges : undefined, recoverItemContent, onChange, discardItem, flushPendingContent, pauseItem, resumeItem, acceptPersistedItem, renameItemId };
}
