// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPendingSaves } from '@/lib/pending-saves';
import { useRouter } from 'next/navigation';
import { Trail, Item, TitleAlign } from '../../types';
import { countTextStats, lastItemStorageKey } from '../../editor-utils';
import {
  getEditorBootstrap,
  getMapPreviews,
  setProjectGraphColors,
  renameProject,
  createTrail,
  renameTrail,
  setTrailDescription,
  deleteTrail as deleteTrailRequest,
  createItem,
  createLooseItem,
  deleteItem,
  renameItem,
  setItemTitleAlign,
  attachItemToTrail,
  detachItemFromTrail,
  reorderTrailItems,
  type ProjectVisibility,
  type MapPreviews,
} from '@/lib/projects-store';
import { resolveItemTrail } from '../../trail-navigation';
import { acceptLoadedContents, getItemContent, getTrailContents } from '@/lib/item-content-client';
import type { ExtractionResult } from '@/lib/extract-selection-client';

export interface ReorderNotice {
  error?: string;
}

export function useProjectEditorState(projectId: string, connectionsPanelOpen: boolean) {
  const router = useRouter();
  const pendingSaves = useRef(createPendingSaves());

  const authRedirectedRef = useRef(false);
  const redirectToLogin = useCallback(() => {
    if (authRedirectedRef.current) return;
    authRedirectedRef.current = true;
    router.replace('/login');
  }, [router]);

  const [loaded, setLoaded] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [description, setDescription] = useState('');
  const [graphColors, setGraphColors] = useState<string | null>(null);
  const [tags, setTags] = useState('');

  const [trails, setTrails] = useState<Trail[]>([]);
  const [reorderNotices, setReorderNotices] = useState<Record<string, ReorderNotice>>({});
  const reorderingTrails = useRef(new Set<string>());
  const dismissReorderNotice = (trailId: string) => setReorderNotices(previous => {
    const next = { ...previous };
    delete next[trailId];
    return next;
  });
  const [items, setItems] = useState<Record<string, Item>>({});
  const [previewResult, setPreviewResult] = useState<{ projectId: string; data: MapPreviews | null } | null>(null);
  const mapPreviews = previewResult?.projectId === projectId ? previewResult.data : undefined;
  const [navigation, setNavigation] = useState<{
    itemId?: string;
    trailId?: string;
    request?: { itemId: string; sequence: number; focus: boolean };
  }>({});
  const navigationSequence = useRef(0);
  const selectedItemId = navigation.itemId;
  const activeTrailId = navigation.trailId;
  const [view, setView] = useState<'write' | 'overview' | 'graph'>('write');
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const entry = new URLSearchParams(window.location.search);
    const preferredItemId = entry.get('note') ?? localStorage.getItem(lastItemStorageKey(projectId));
    getEditorBootstrap(projectId, preferredItemId, entry.get('trail')).then((result) => {
      if (cancelled) return;
      if (!result) {
        router.replace('/projects');
        return;
      }
      const { project } = result;
      const contents = acceptLoadedContents(result.contents);
      for (const [itemId, content] of Object.entries(contents)) {
        const item = project.items[itemId];
        if (item) project.items[itemId] = { ...item, content, textStats: countTextStats(content) };
      }
      setProjectTitle(project.title);
      setVisibility(project.visibility);
      setDescription(project.description);
      setGraphColors(project.graphColors);
      setTags(project.tags);
      setTrails(project.trails);
      setItems(project.items);
      setProfile(result.profile);
      setLoaded(true);
      const itemId = result.selectedItemId;
      setNavigation({ trailId: result.selectedTrailId, itemId,
        request: itemId ? { itemId, sequence: ++navigationSequence.current, focus: entry.get('write') === '1' } : undefined });

      if (entry.has('note')) window.history.replaceState(window.history.state, '', window.location.pathname);
    }).catch(() => {
      if (!cancelled) redirectToLogin();
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, router, redirectToLogin]);

  useEffect(() => {
    if (!loaded || (!connectionsPanelOpen && view !== 'graph') || mapPreviews !== undefined) return;
    let cancelled = false;
    getMapPreviews(projectId).then((data) => {
      if (!cancelled) setPreviewResult({ projectId, data });
    }).catch(() => {
      if (!cancelled) setPreviewResult({ projectId, data: null });
    });
    return () => { cancelled = true; };
  }, [projectId, loaded, connectionsPanelOpen, view, mapPreviews]);

  useEffect(() => {
    if (!loaded) return;
    if (selectedItemId) {
      localStorage.setItem(lastItemStorageKey(projectId), selectedItemId);
    } else {
      localStorage.removeItem(lastItemStorageKey(projectId));
    }
  }, [projectId, selectedItemId, loaded]);

  const selectedItem = selectedItemId ? items[selectedItemId] : undefined;

  const activeTrail = useMemo(() => trails.find((t) => t.id === activeTrailId), [trails, activeTrailId]);

  const commitItemTitle = (itemId: string, currentTitle: string, nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentTitle) return;
    void handleRenameItem(itemId, trimmed).catch(() => {});
  };

  const handleSetItemTitleAlign = (itemId: string, titleAlign: TitleAlign) => pendingSaves.current.track(`align:${itemId}`, async () => {
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, titleAlign } };
    });
    await setItemTitleAlign(itemId, titleAlign);
  }, true);

  const handleSetGraphColors = (colors: string) => pendingSaves.current.track('graph-colors', async () => {
    await setProjectGraphColors(projectId, colors);
    setGraphColors(colors);
  });

  const [contentLoadError, setContentLoadError] = useState(false);
  const [contentRetry, setContentRetry] = useState(0);
  const retryContent = () => setContentRetry((n) => n + 1);
  const trailContentIds = activeTrail?.itemIds.join('|');

  useEffect(() => {
    let cancelled = false;
    if (!activeTrailId || activeTrail?.itemIds.every((id) => items[id]?.content != null)) return;
    getTrailContents(activeTrailId)
      .then((byId) => {
        if (cancelled) return;
        setContentLoadError(false);
        setItems((prev) => {
          const next = { ...prev };
          for (const [itemId, content] of Object.entries(byId)) {
            if (next[itemId] && next[itemId].content == null) next[itemId] = { ...next[itemId], content, textStats: countTextStats(content) };
          }
          return next;
        });
      })
      .catch(() => { if (!cancelled) setContentLoadError(true); });
    return () => { cancelled = true; };
  }, [activeTrailId, trailContentIds, contentRetry, activeTrail, items]);

  useEffect(() => {
    let cancelled = false;
    if (activeTrailId || !selectedItemId || items[selectedItemId]?.content != null) return;
    getItemContent(selectedItemId).then((content) => {
      if (cancelled) return;
      setContentLoadError(false);
      setItems((prev) => prev[selectedItemId] && prev[selectedItemId].content == null
        ? { ...prev, [selectedItemId]: { ...prev[selectedItemId], content, textStats: countTextStats(content) } } : prev);
    }).catch(() => { if (!cancelled) setContentLoadError(true); });
    return () => { cancelled = true; };
  }, [activeTrailId, selectedItemId, contentRetry, items]);

  const handleVisibleItem = useCallback((itemId: string) => {
    setNavigation((prev) => prev.itemId === itemId ? prev : { ...prev, itemId });
  }, []);

  const handleSelectItem = (item: Item, trailId?: string) => {
    setView('write');
    setContentLoadError(false);
    const request = { itemId: item.id, sequence: ++navigationSequence.current, focus: true };
    setNavigation((prev) => ({
      itemId: item.id,
      trailId: resolveItemTrail(trails, item.id, prev.trailId, trailId),
      request,
    }));
  };

  const handleSelectTrail = (trailId: string) => {
    const trail = trails.find((candidate) => candidate.id === trailId);
    if (!trail) return;
    const first = trail.itemIds.map((id) => items[id]).find(Boolean);
    if (first) handleSelectItem(first, trailId);
    else {
      setView('write');
      setNavigation({ trailId });
    }
  };

  const handleReorderTrailItems = (trailId: string, itemIds: string[]) => {
    if (reorderingTrails.current.has(trailId)) return Promise.resolve();
    return pendingSaves.current.track(`order:${trailId}`, async () => {
      const previous = trails.find(trail => trail.id === trailId);
      if (!previous || reorderingTrails.current.has(trailId)) return;
      const stepByItemId = new Map(previous.steps.map(step => [step.itemId, step]));
      if (itemIds.length !== previous.steps.length || new Set(itemIds).size !== itemIds.length || itemIds.some(id => !stepByItemId.has(id))) return;
      reorderingTrails.current.add(trailId);
      setTrails(prev => prev.map(trail => trail.id === trailId
        ? { ...trail, itemIds, steps: itemIds.map(id => stepByItemId.get(id)!) } : trail));
      try {
        await reorderTrailItems(trailId, itemIds);
        setReorderNotices(prev => ({ ...prev, [trailId]: {
        } }));
      } catch (err) {
        console.error(err);
        setTrails(prev => prev.map(trail => {
          if (trail.id !== trailId) return trail;
          const currentSteps = new Map(trail.steps.map(step => [step.itemId, step]));
          return { ...trail, itemIds: previous.itemIds, steps: previous.steps.map(step => currentSteps.get(step.itemId) ?? step) };
        }));
        setReorderNotices(prev => ({ ...prev, [trailId]: {
          error: 'Could not reorder this trail. The previous order was restored. Please try again.',
        } }));
        throw err;
      } finally {
        reorderingTrails.current.delete(trailId);
      }
    }, true).catch(() => {});
  };

  const handleCreateTrail = (title: string) => pendingSaves.current.track(`create-trail:${title}`, async () => {
    const newTrail = await createTrail(projectId, title);
    setTrails(prevTrails => [...prevTrails, newTrail]);
  }, false);

  const handleCreateItem = (trailId: string, title: string) => pendingSaves.current.track(`create-item:${trailId}:${title}`, async () => {
    const newItem = await createItem(trailId, title);
    setItems(prevItems => ({ ...prevItems, [newItem.id]: newItem }));
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId
        ? {
            ...trail,
            itemIds: [...trail.itemIds, newItem.id],
            steps: [...trail.steps, { itemId: newItem.id }],
          }
        : trail
    ));
    setView('write');
    setNavigation({ trailId, itemId: newItem.id, request: { itemId: newItem.id, sequence: ++navigationSequence.current, focus: true } });
  }, false);

  const handleLinkItemToTrail = (trailId: string, itemId: string) => pendingSaves.current.track(`attach:${trailId}:${itemId}`, async () => {
    await attachItemToTrail(trailId, itemId);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId && !trail.itemIds.includes(itemId)
        ? {
            ...trail,
            itemIds: [...trail.itemIds, itemId],
            steps: [...trail.steps, { itemId }],
          }
        : trail
    ));
  }, false);

  const handleUnlinkItemFromTrail = (trailId: string, itemId: string) => pendingSaves.current.track(`detach:${trailId}:${itemId}`, async () => {
    await detachItemFromTrail(trailId, itemId);
    const nextTrails = trails.map(trail =>
      trail.id === trailId
        ? {
            ...trail,
            itemIds: trail.itemIds.filter(id => id !== itemId),
            steps: trail.steps.filter(s => s.itemId !== itemId),
          }
        : trail
    );
    setTrails(nextTrails);
    if (activeTrailId === trailId && selectedItemId === itemId) {
      const next = nextTrails.find((t) => t.id === trailId)?.itemIds[0];
      setNavigation({ trailId: next ? trailId : undefined, itemId: next ?? itemId });
    }
    if (!nextTrails.some(trail => trail.itemIds.includes(itemId))) {
      setItems(prev => {
        const it = prev[itemId];
        return it && !it.unfiled ? { ...prev, [itemId]: { ...it, unfiled: true } } : prev;
      });
    }
  }, false);

  const handleCreateLooseItem = (title: string) => pendingSaves.current.track(`create-loose:${title}`, async () => {
    const newItem = await createLooseItem(projectId, title);
    setItems(prevItems => ({ ...prevItems, [newItem.id]: newItem }));
    setView('write');
    setNavigation({ itemId: newItem.id, request: { itemId: newItem.id, sequence: ++navigationSequence.current, focus: true } });
  }, false);

  const handleDeleteItem = (itemId: string) => pendingSaves.current.track(`delete-item:${itemId}`, async () => {
    await deleteItem(itemId);
    setTrails(prevTrails => prevTrails.map(trail => ({
      ...trail,
      itemIds: trail.itemIds.filter(id => id !== itemId),
      steps: trail.steps.filter(s => s.itemId !== itemId),
    })));
    setItems(prevItems => {
      const next = { ...prevItems };
      delete next[itemId];
      return next;
    });
    setNavigation((prev) => {
      if (prev.itemId !== itemId) return prev;
      const next = trails.find((t) => t.id === prev.trailId)?.itemIds.find((id) => id !== itemId);
      return { ...prev, itemId: next, request: undefined };
    });
  }, false);

  const handleRenameTrail = (trailId: string, title: string) => pendingSaves.current.track(`trail-title:${trailId}`, async () => {
    await renameTrail(trailId, title);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId ? { ...trail, title } : trail
    ));
  }, true);

  const handleSetTrailDescription = (trailId: string, description: string) => pendingSaves.current.track(`trail-description:${trailId}`, async () => {
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId ? { ...trail, description } : trail
    ));
    await setTrailDescription(trailId, description);
  }, true);

  const handleRenameItem = (itemId: string, title: string) => pendingSaves.current.track(`item-title:${itemId}`, async () => {
    await renameItem(itemId, title);
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, title } };
    });
  }, true);

  const handleDeleteTrail = (trailId: string) => pendingSaves.current.track(`delete-trail:${trailId}`, async () => {
    const target = trails.find(trail => trail.id === trailId);
    if (!target) return;

    await deleteTrailRequest(trailId);
    const remainingTrails = trails.filter(trail => trail.id !== trailId);
    setTrails(remainingTrails);
    if (activeTrailId === trailId) {
      const next = remainingTrails[0];
      setNavigation({ trailId: next?.id, itemId: next?.itemIds[0] });
    }
    const orphanIds = target.itemIds.filter(
      itemId => !remainingTrails.some(trail => trail.itemIds.includes(itemId))
    );
    if (orphanIds.length > 0) {
      setItems(prev => {
        const next = { ...prev };
        orphanIds.forEach(id => {
          if (next[id] && !next[id].unfiled) next[id] = { ...next[id], unfiled: true };
        });
        return next;
      });
    }
  }, false);

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
  };

  const updateItemContentLocally = useCallback((itemId: string, content: string) => {
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, content, textStats: countTextStats(content) } };
    });
  }, []);

  const handleRenameProject = (title: string) => {
    setProjectTitle(title);
    void pendingSaves.current.track("project-title", () => renameProject(projectId, title), true).catch(() => {});
  };

  const retryMapPreviews = useCallback(() => {
    setPreviewResult(null);
    void getMapPreviews(projectId).then((data) => setPreviewResult({ projectId, data })).catch(() => setPreviewResult({ projectId, data: null }));
  }, [projectId]);

  return {
    loaded,
    projectTitle,
    visibility,
    description,
    setDescription,
    tags,
    setTags,
    profile,
    trails,
    items,
    mapPreviews,
    retryMapPreviews,
    selectedItem,
    selectedItemId,
    activeTrail,
    activeTrailId,
    graphColors,
    view,
    setView,
    contentLoadError,
    retryContent,
    navigationRequest: navigation.request,
    handleVisibleItem,
    handleSelectTrail,
    redirectToLogin,
    flushProjectChanges: () => pendingSaves.current.flush(),
    applyExtraction: (sourceId: string, expectedContent: string, result: ExtractionResult, applySource: boolean) => {
      setItems(previous => ({ ...previous,
        [result.item.id]: { ...result.item, textStats: countTextStats(result.item.content ?? '') },
        ...(applySource && previous[sourceId]?.content === expectedContent ? { [sourceId]: { ...previous[sourceId], content: result.sourceContent, textStats: countTextStats(result.sourceContent) } } : {}),
      }));
      if (result.trailId) setTrails(previous => previous.map(trail => trail.id === result.trailId
        ? { ...trail, steps: result.steps, itemIds: result.steps.map(step => step.itemId) } : trail));
    },
    commitItemTitle,
    handleSetItemTitleAlign,
    handleSetGraphColors,
    handleSelectItem,
    handleReorderTrailItems,
    reorderNotices,
    dismissReorderNotice,
    handleCreateTrail,
    handleCreateItem,
    handleLinkItemToTrail,
    handleUnlinkItemFromTrail,
    handleCreateLooseItem,
    handleDeleteItem,
    handleRenameTrail,
    handleSetTrailDescription,
    handleRenameItem,
    handleDeleteTrail,
    handleVisibilityChange,
    updateItemContentLocally,
    handleRenameProject,
  };
}
