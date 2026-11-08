import { serializeNoteContent } from '@/app/editor/note-content';
// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPendingSaves } from '@/lib/pending-saves';
import { assertProjectText } from '@/lib/project-validation';
import { useRouter } from 'next/navigation';
import { Trail, Item, TitleAlign } from '../../types';
import { collectPlainText, countTextStats, lastItemStorageKey } from '../../editor-utils';
import {
  getMapPreviews,
  setProjectGraphColors,
  renameProject,
  createTrail,
  renameTrail,
  deleteTrail as deleteTrailRequest,
  createItem,
  createLooseItem,
  deleteItem,
  setItemTitleAlign,
  attachItemToTrail,
  detachItemFromTrail,
  reorderTrailItems,
  reorderProjectTrails,
  type ProjectVisibility,
  type MapPreviews,
} from '@/lib/projects-store';
import { resolveItemTrail } from '../../trail-navigation';
import { getEditorBootstrap } from '@/lib/editor-bootstrap-client';
import type { ProjectRole } from '@/lib/projects-store';
import { acceptLoadedContents, getItemContent, getTrailContents, resetItemContents } from '@/lib/item-content-client';
import type { ExtractionResult } from '@/lib/extract-selection-client';
import { useAutoSave } from '@/app/editor/[projectId]/hooks/useAutoSave';
import { clearLocalDrafts, editorDraftForRoute, type DraftCommitResult } from '@/lib/editor-draft';
import type { CollabHandoff } from '@/app/editor/plugins/CollaborationNotePlugin';
import type { UserProfile } from '@/lib/profile';
import { ItemTitleSaves } from '@/lib/item-title-saves';
import { $noteTitle } from '@/app/editor/nodes/TitleNode';
import { EMPTY_STRUCTURE, absorbed, addItem, addTrail, alignItem, compose, followNavigation, linkItem, orderTrailItems, orderTrails,
  parseStructure, removeItem, removeTrail, renameItem, renameTrail as renameTrailOp, unlinkItem, view as structureView,
  type ItemMeta, type PendingOp, type Structure, type StructureOp } from '@/app/editor/structure';

const subscribeIdle = () => () => {};
const idleDraft = { status: 'saved' as const, error: '' };
const getIdleDraft = () => idleDraft;

export interface ReorderNotice {
  error?: string;
}

type LoadedContent = { content: string; textStats: { words: number; characters: number } };
const SETTLED_OP_MS = 10_000;
const metaOf = (item: Item): ItemMeta => ({ id: item.id, title: item.title, titleAlign: item.titleAlign, unfiled: item.unfiled, textStats: item.textStats });
const loadedContent = (content: string): LoadedContent => ({ content, textStats: countTextStats(content) });

export function useProjectEditorState(routeProjectId: string, connectionsPanelOpen: boolean, user?: Pick<UserProfile, 'userId' | 'username' | 'imageUrl'>) {
  const [draft] = useState(() => typeof window !== 'undefined' && user?.userId ? editorDraftForRoute(user.userId, routeProjectId) : null);
  const draftState = useSyncExternalStore(draft?.subscribe ?? subscribeIdle, draft?.getSnapshot ?? getIdleDraft, getIdleDraft);
  const isDraft = !!draft && draftState.status !== 'saved';
  const [projectId, setProjectId] = useState(() => draft?.backup.result?.projectId ?? draft?.editorKey ?? routeProjectId);
  const draftInitialized = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshProject = useCallback(() => setRefreshKey(key => key + 1), []);
  useEffect(() => { if (user?.userId) clearLocalDrafts(user.userId); }, [user?.userId]);
  const router = useRouter();
  const pendingSaves = useRef(createPendingSaves());
  const [titleSaves] = useState(() => new ItemTitleSaves(user?.userId));
  const titleState = useSyncExternalStore(titleSaves.subscribe, titleSaves.getSnapshot, titleSaves.getSnapshot);
  useEffect(() => {
    titleSaves.start();
    const online = () => titleSaves.retry();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      void titleSaves.flush().catch(() => {});
      if (titleSaves.needsUnloadWarning()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      titleSaves.dispose();
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [titleSaves]);

  const authRedirectedRef = useRef(false);
  const redirectToLogin = useCallback(() => {
    if (authRedirectedRef.current) return;
    authRedirectedRef.current = true;
    router.replace('/login');
  }, [router]);

  const [loaded, setLoaded] = useState(false);
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const [projectTitle, setProjectTitle] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [description, setDescription] = useState('');
  const [graphColors, setGraphColors] = useState<string | null>(null);
  const [tags, setTags] = useState('');

  const [remote, setRemoteState] = useState<Structure>(EMPTY_STRUCTURE);
  const remoteRef = useRef(remote);
  const setRemote = useCallback((next: Structure | ((previous: Structure) => Structure)) => {
    remoteRef.current = typeof next === 'function' ? next(remoteRef.current) : next;
    setRemoteState(remoteRef.current);
  }, []);
  const [ops, setOpsState] = useState<PendingOp[]>([]);
  const opsRef = useRef(ops);
  const setOps = useCallback((next: PendingOp[] | ((previous: PendingOp[]) => PendingOp[])) => {
    opsRef.current = typeof next === 'function' ? next(opsRef.current) : next;
    setOpsState(opsRef.current);
  }, []);
  const [contents, setContents] = useState<Record<string, LoadedContent>>({});
  const [editorKeys, setEditorKeys] = useState<Record<string, string>>({});
  const shown = useMemo(() => structureView(remote, ops), [remote, ops]);
  const trails: Trail[] = shown.trails;
  const items = useMemo(() => Object.fromEntries(Object.entries(shown.items).map(([id, meta]) => [id, {
    ...meta, editorKey: editorKeys[id] ?? meta.editorKey, content: contents[id]?.content ?? null, textStats: contents[id]?.textStats ?? meta.textStats,
  }])) as Record<string, Item>, [shown, contents, editorKeys]);
  const pend = useCallback((key: string, apply: StructureOp) => setOps(previous => previous.some(op => op.key === key)
    ? previous.map(op => op.key === key ? { key, apply } : op) : [...previous, { key, apply }]), [setOps]);
  const drop = useCallback((key: string) => setOps(previous => previous.filter(op => op.key !== key)), [setOps]);
  const settle = useCallback((key: string, apply?: StructureOp) => {
    const token = {};
    setOps(previous => {
      const existing = previous.find(op => op.key === key);
      const next = { key, apply: apply ?? existing?.apply, done: token };
      if (!next.apply) return previous;
      const op = next as PendingOp;
      if (absorbed(op, remoteRef.current)) return previous.filter(other => other.key !== key);
      return existing ? previous.map(other => other.key === key ? op : other) : [...previous, op];
    });
    setTimeout(() => setOps(previous => previous.filter(op => op.done !== token)), SETTLED_OP_MS);
  }, [setOps]);
  const optimistic = useCallback(async (key: string, apply: StructureOp, run: () => Promise<unknown>, keepOnFailure = false) => {
    pend(key, apply);
    try {
      await run();
    } catch (error) {
      if (!keepOnFailure) drop(key);
      throw error;
    }
    settle(key);
  }, [pend, drop, settle]);
  useEffect(() => titleSaves.subscribe(() => {
    for (const op of opsRef.current) if (op.key.startsWith('title:') && !op.done && !titleSaves.has(op.key.slice('title:'.length))) settle(op.key);
  }), [titleSaves, settle]);
  const [reorderNotices, setReorderNotices] = useState<Record<string, ReorderNotice>>({});
  const reorderingTrails = useRef(new Set<string>());
  const reorderingProjectTrails = useRef(false);
  const [trailOrderError, setTrailOrderError] = useState<string | null>(null);
  const dismissReorderNotice = (trailId: string) => setReorderNotices(previous => {
    const next = { ...previous };
    delete next[trailId];
    return next;
  });
  const [previewResult, setPreviewResult] = useState<{ projectId: string; data: MapPreviews | null } | null>(null);
  const mapPreviews = previewResult?.projectId === projectId ? previewResult.data : undefined;
  const [navigation, setNavigation] = useState<{
    itemId?: string;
    trailId?: string;
    request?: { itemId: string; sequence: number; focus: boolean; embedIndex?: number };
  }>({});
  const navigationSequence = useRef(0);
  const selectedItemId = navigation.itemId;
  const activeTrailId = navigation.trailId;
  const updateItemContentLocally = useCallback((itemId: string, content: string) => {
    setContents(previous => ({ ...previous, [itemId]: loadedContent(content) }));
  }, []);
  const latestStructure = useRef<unknown>(null);
  const receiveStructure = useCallback((raw: unknown) => {
    if (raw !== undefined) latestStructure.current = raw;
    const next = parseStructure(latestStructure.current);
    const current = remoteRef.current;
    if (!next || current.version < 0 || next.version <= current.version) return;
    if (next.restoreEpoch !== current.restoreEpoch) {
      setRemote(previous => ({ ...previous, version: -1 }));
      refreshProject();
      return;
    }
    setRemote(next);
    setOps(previous => previous.filter(op => !op.done || !absorbed(op, next)));
    setNavigation(previous => followNavigation(previous, structureView(next, opsRef.current)));
  }, [refreshProject, setRemote, setOps]);

  const autoSave = useAutoSave({ onOptimisticUpdate: updateItemContentLocally });
  const [collabHandoff, setCollabHandoff] = useState<CollabHandoff & { itemId: string } | null>(null);
  const [unsyncedText, setUnsyncedText] = useState<string | null>(null);
  const onCollabHandoff = useCallback((applied: boolean) => {
    if (applied) draft?.completeHandoff();
    else if (collabHandoff) setUnsyncedText(collectPlainText(collabHandoff.content).join('\n'));
    setCollabHandoff(null);
  }, [draft, collabHandoff]);
  const [view, setView] = useState<'write' | 'graph'>('write');
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null } | null>(null);
  const [role, setRole] = useState<ProjectRole>('OWNER');
  const [accessLost, setAccessLost] = useState(false);
  const [noAccessProjectId, setNoAccessProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    const applyIds = (result: DraftCommitResult) => {
      setProjectId(result.projectId);
      setRestoreEpoch(result.restoreEpoch);
      const itemId = String(result.itemId);
      const latest = draft.backup.latest;
      setRemote(previous => ({ ...previous, restoreEpoch: result.restoreEpoch,
        items: { [itemId]: { ...Object.values(previous.items).find(item => item.editorKey === draft.editorKey), id: itemId, editorKey: draft.editorKey,
          title: latest.item.title, titleAlign: latest.item.titleAlign, unfiled: false } },
        trails: [{ id: String(result.trailId), editorKey: draft.editorKey, title: latest.trail.title,
          description: '', version: 1, forkedFrom: null, itemIds: [itemId], steps: [{ itemId }] }] }));
      setContents({ [itemId]: loadedContent(latest.item.content) });
      setNavigation(previous => ({ ...previous, trailId: String(result.trailId), itemId: String(result.itemId),
        request: previous.request ? { ...previous.request, itemId: String(result.itemId) } : undefined }));
      if (window.location.pathname !== `/editor/${result.projectId}`) router.replace(`/editor/${result.projectId}`);
    };
    draft.setOnCreated(applyIds);
    const online = () => { if (draft.getSnapshot().status !== 'saved') draft.retry(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (draft.needsUnloadWarning()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      draft.setOnCreated();
      draft.dispose();
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [draft, router, setRemote]);

  useEffect(() => {
    if (!draft || draftState.status !== 'saved' || !draft.backup.result) return;
    void Promise.resolve().then(() => {
      setProjectTitle(title => title.trim() || 'Untitled project');
      setRemote(previous => ({ ...previous,
        trails: previous.trails.map(trail => ({ ...trail, title: trail.title.trim() || 'My first trail' })),
        items: Object.fromEntries(Object.entries(previous.items).map(([id, item]) => [id, { ...item,
          title: item.title.trim() || 'Untitled note', editorKey: item.editorKey === draft.editorKey ? undefined : item.editorKey }])) }));
      if (draft.handoff && draft.backup.result) setCollabHandoff({ itemId: String(draft.backup.result.itemId), ...draft.handoff });
    });
  }, [draft, draftState.status, setRemote]);

  useEffect(() => {
    let cancelled = false;
    if (draft && !refreshKey && (routeProjectId === 'new' || routeProjectId === draft.backup.result?.projectId)) {
      if (!draftInitialized.current) {
        void draft.claim().then(() => {
          if (cancelled || draftInitialized.current) return;
          draftInitialized.current = true;
          const latest = draft.backup.latest;
          setProjectId(draft.backup.result?.projectId ?? draft.editorKey);
          const itemId = draft.editorKey;
          setProjectTitle(latest.project.title);
          setProfile(user ? { username: user.username, imageUrl: user.imageUrl } : null);
          setRemote({ ...EMPTY_STRUCTURE,
            items: { [itemId]: { id: itemId, editorKey: draft.editorKey, title: latest.item.title, titleAlign: latest.item.titleAlign, unfiled: false } },
            trails: [{ id: draft.editorKey, editorKey: draft.editorKey, title: latest.trail.title, description: '', version: 1,
              forkedFrom: null, itemIds: [itemId], steps: [{ itemId }] }] });
          setOps([]);
          setContents({ [itemId]: loadedContent(latest.item.content) });
          setNavigation({ itemId, trailId: draft.editorKey, request: { itemId, sequence: ++navigationSequence.current, focus: true } });
          setLoaded(true);
          draft.start();
        });
      }
      return () => { cancelled = true; };
    }
    const entry = new URLSearchParams(window.location.search);
    let preferredItemId = entry.get('note');
    try { preferredItemId ??= localStorage.getItem(lastItemStorageKey(routeProjectId)); } catch {}
    getEditorBootstrap(routeProjectId, preferredItemId, entry.get('trail')).then((result) => {
      if (cancelled) return;
      if (!result) {
        if (refreshKey) setAccessLost(true);
        else setNoAccessProjectId(routeProjectId);
        return;
      }
      const { project } = result;
      setProjectId(routeProjectId);
      setRestoreEpoch(result.restoreEpoch);
      resetItemContents(Object.keys(project.items));
      const loaded = acceptLoadedContents(result.contents);
      const pendingTitles = titleSaves.restore(routeProjectId, Object.keys(project.items));
      setProjectTitle(project.title);
      setVisibility(project.visibility);
      setDescription(project.description);
      setGraphColors(project.graphColors);
      setTags(project.tags);
      setRemote(result.structure);
      setOps(Object.entries(pendingTitles).map(([id, title]) => ({ key: `title:${id}`, apply: renameItem(id, title) })));
      setContents(Object.fromEntries(Object.entries(loaded).filter(([id]) => result.structure.items[id]).map(([id, content]) => [id, loadedContent(content)])));
      setEditorKeys({});
      receiveStructure(undefined);
      setProfile(result.profile);
      setRole(result.role);
      setLoaded(true);
      const itemId = result.selectedItemId;
      setNavigation({ trailId: result.selectedTrailId, itemId,
        request: itemId ? { itemId, sequence: ++navigationSequence.current, focus: entry.get('write') === '1', embedIndex: /^\d+$/.test(entry.get('embed') ?? '') ? Number(entry.get('embed')) : undefined } : undefined });

      if (entry.has('note')) window.history.replaceState(window.history.state, '', window.location.pathname);
    }).catch(() => {
      if (!cancelled) redirectToLogin();
    });
    return () => {
      cancelled = true;
    };
  }, [routeProjectId, router, redirectToLogin, draft, user, titleSaves, refreshKey, setRemote, setOps, receiveStructure]);

  useEffect(() => {
    if (isDraft || !loaded || (!connectionsPanelOpen && view !== 'graph') || mapPreviews !== undefined) return;
    let cancelled = false;
    getMapPreviews(projectId).then((data) => {
      if (!cancelled) setPreviewResult({ projectId, data });
    }).catch(() => {
      if (!cancelled) setPreviewResult({ projectId, data: null });
    });
    return () => { cancelled = true; };
  }, [projectId, loaded, connectionsPanelOpen, view, mapPreviews, isDraft]);

  useEffect(() => {
    if (!loaded || isDraft) return;
    try {
    if (selectedItemId) {
      localStorage.setItem(lastItemStorageKey(projectId), selectedItemId);
    } else {
      localStorage.removeItem(lastItemStorageKey(projectId));
    }
    } catch {}
  }, [projectId, selectedItemId, loaded, isDraft]);

  const selectedItem = selectedItemId ? items[selectedItemId] : undefined;

  const activeTrail = useMemo(() => trails.find((t) => t.id === activeTrailId), [trails, activeTrailId]);

  const commitItemTitle = (itemId: string, currentTitle: string, nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentTitle) return;
    void handleRenameItem(itemId, trimmed).catch(() => {});
  };

  const handleSetItemTitleAlign = (itemId: string, titleAlign: TitleAlign) => {
    if (draft && draft.getSnapshot().status !== 'saved') {
      draft.update({ item: { ...draft.backup.latest.item, titleAlign } });
      setRemote(alignItem(itemId, titleAlign));
      return Promise.resolve();
    }
    pend(`align:${itemId}`, alignItem(itemId, titleAlign));
    return pendingSaves.current.track(`align:${itemId}`, () => optimistic(`align:${itemId}`, alignItem(itemId, titleAlign),
      () => setItemTitleAlign(itemId, titleAlign, restoreEpoch, projectId), true), true);
  };

  const handleSetGraphColors = (colors: string) => pendingSaves.current.track('graph-colors', async () => {
    await setProjectGraphColors(projectId, colors, restoreEpoch);
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
        setContents((prev) => {
          const next = { ...prev };
          for (const [itemId, content] of Object.entries(byId)) if (!next[itemId]) next[itemId] = loadedContent(content);
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
      setContents((prev) => prev[selectedItemId] ? prev : { ...prev, [selectedItemId]: loadedContent(content) });
    }).catch(() => { if (!cancelled) setContentLoadError(true); });
    return () => { cancelled = true; };
  }, [activeTrailId, selectedItemId, contentRetry, items]);

  const handleVisibleItem = useCallback((itemId: string) => {
    setNavigation((prev) => prev.itemId === itemId ? prev : { ...prev, itemId });
  }, []);

  const handleSelectItem = (item: Item, trailId?: string, embedIndex?: number) => {
    void titleSaves.flush().catch(() => {});
    setView('write');
    setContentLoadError(false);
    const request = { itemId: item.id, sequence: ++navigationSequence.current, focus: true, embedIndex };
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
      try {
        await optimistic(`order:${trailId}`, orderTrailItems(trailId, itemIds), () => reorderTrailItems(trailId, itemIds, restoreEpoch));
        setReorderNotices(prev => ({ ...prev, [trailId]: {
        } }));
      } catch (err) {
        console.error(err);
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
    const newTrail = await createTrail(projectId, title, restoreEpoch);
    settle(`create-trail:${newTrail.id}`, addTrail(newTrail));
  }, false);

  const handleReorderTrails = (trailIds: string[]) => {
    if (reorderingProjectTrails.current) return Promise.resolve();
    const byId = new Map(trails.map(trail => [trail.id, trail]));
    if (trailIds.length !== trails.length || new Set(trailIds).size !== trails.length || trailIds.some(id => !byId.has(id))) return Promise.resolve();
    reorderingProjectTrails.current = true;
    setTrailOrderError(null);
    pend('trail-order', orderTrails(trailIds));
    return pendingSaves.current.track('trail-order', async () => {
      try {
        await optimistic('trail-order', orderTrails(trailIds), () => reorderProjectTrails(projectId, trailIds, restoreEpoch));
      } catch (error) {
        setTrailOrderError('Could not reorder the trails. The previous order was restored. Please try again.');
        throw error;
      } finally {
        reorderingProjectTrails.current = false;
      }
    }, false).catch(() => {});
  };

  const handleMoveItemToTrail = (sourceId: string, targetId: string, itemId: string, targetIndex?: number) => {
    const source = trails.find(trail => trail.id === sourceId);
    const target = trails.find(trail => trail.id === targetId);
    if (sourceId === targetId || !source?.itemIds.includes(itemId) || !target) return Promise.resolve();
    if (reorderingTrails.current.has(sourceId) || reorderingTrails.current.has(targetId)) {
      return Promise.reject(new Error('Wait for the previous trail change to finish.'));
    }
    const existingIndex = target.itemIds.indexOf(itemId);
    const attachedOrder = existingIndex < 0 ? [...target.itemIds, itemId] : target.itemIds;
    const targetOrder = target.itemIds.filter(id => id !== itemId);
    const index = targetIndex === undefined
      ? existingIndex < 0 ? targetOrder.length : existingIndex
      : Math.max(0, Math.min(targetOrder.length, targetIndex - (existingIndex >= 0 && existingIndex < targetIndex ? 1 : 0)));
    targetOrder.splice(index, 0, itemId);
    const needsOrder = targetOrder.some((id, position) => attachedOrder[position] !== id);
    reorderingTrails.current.add(sourceId);
    reorderingTrails.current.add(targetId);
    const key = `move:${sourceId}:${targetId}:${itemId}`;
    return pendingSaves.current.track(key, async () => {
      let attached = target.itemIds.includes(itemId);
      pend(key, compose(linkItem(targetId, itemId), orderTrailItems(targetId, targetOrder), unlinkItem(sourceId, itemId)));
      try {
        await attachItemToTrail(targetId, itemId, restoreEpoch);
        attached = true;
        if (needsOrder) await reorderTrailItems(targetId, targetOrder, restoreEpoch);
        await detachItemFromTrail(sourceId, itemId, restoreEpoch);
        settle(key);
        setNavigation(previous => previous.trailId === sourceId && previous.itemId === itemId
          ? { ...previous, trailId: targetId } : previous);
      } catch (error) {
        if (attached) settle(key, linkItem(targetId, itemId));
        else drop(key);
        throw new Error(attached
          ? 'Could not finish the move. The note is in both trails; retry the move.'
          : 'Could not move the note. It remains in its original trail.', { cause: error });
      } finally {
        reorderingTrails.current.delete(sourceId);
        reorderingTrails.current.delete(targetId);
      }
    }, false);
  };

  const createItemWith = async (trailId: string | undefined, title: string, create: () => Promise<Item>) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `create:${tempId}`;
    const temp: ItemMeta = { id: tempId, editorKey: tempId, title, titleAlign: 'center', unfiled: !trailId, textStats: { words: 0, characters: 0 } };
    setContents(previous => ({ ...previous, [tempId]: loadedContent('') }));
    pend(key, addItem(temp, trailId));
    setView('write');
    setNavigation({ trailId, itemId: tempId, request: { itemId: tempId, sequence: ++navigationSequence.current, focus: true } });
    let newItem: Item;
    try {
      newItem = await create();
    } catch (err) {
      drop(key);
      setNavigation(prev => prev.itemId === tempId ? { ...prev, itemId: undefined, request: undefined } : prev);
      throw err;
    }
    setEditorKeys(previous => ({ ...previous, [newItem.id]: tempId }));
    setContents(previous => ({ ...previous, [newItem.id]: previous[tempId] ?? loadedContent(newItem.content ?? '') }));
    settle(key, addItem(metaOf(newItem), trailId));
    setNavigation(prev => prev.itemId === tempId ? { ...prev, itemId: newItem.id, request: prev.request ? { ...prev.request, itemId: newItem.id } : undefined } : prev);
  };

  const handleCreateItem = (trailId: string, title: string) => pendingSaves.current.track(`create-item:${trailId}:${title}`,
    () => createItemWith(trailId, title, () => createItem(trailId, title, restoreEpoch)), false);

  const handleLinkItemToTrail = (trailId: string, itemId: string) => pendingSaves.current.track(`attach:${trailId}:${itemId}`,
    () => optimistic(`attach:${trailId}:${itemId}`, linkItem(trailId, itemId), () => attachItemToTrail(trailId, itemId, restoreEpoch)), false);

  const handleUnlinkItemFromTrail = (trailId: string, itemId: string) => pendingSaves.current.track(`detach:${trailId}:${itemId}`, async () => {
    const nextTrail = unlinkItem(trailId, itemId)(shown).trails.find(trail => trail.id === trailId);
    await optimistic(`detach:${trailId}:${itemId}`, unlinkItem(trailId, itemId), () => detachItemFromTrail(trailId, itemId, restoreEpoch));
    if (activeTrailId === trailId && selectedItemId === itemId) {
      const next = nextTrail?.itemIds[0];
      setNavigation({ trailId: next ? trailId : undefined, itemId: next ?? itemId });
    }
  }, false);

  const handleCreateLooseItem = (title: string) => pendingSaves.current.track(`create-loose:${title}`,
    () => createItemWith(undefined, title, () => createLooseItem(projectId, title, restoreEpoch)), false);

  const handleDeleteItem = (itemId: string) => pendingSaves.current.track(`delete-item:${itemId}`, async () => {
    const next = trails.find(trail => trail.id === activeTrailId)?.itemIds.find(id => id !== itemId);
    await optimistic(`delete-item:${itemId}`, removeItem(itemId), () => deleteItem(itemId, restoreEpoch, projectId));
    titleSaves.discard(projectId, itemId);
    drop(`title:${itemId}`);
    setNavigation(prev => prev.itemId !== itemId ? prev : { ...prev, itemId: next, request: undefined });
  }, false);

  const handleRenameTrail = (trailId: string, title: string) => {
    if (draft && draft.getSnapshot().status !== 'saved') {
      setRemote(previous => ({ ...previous, trails: previous.trails.map(trail => ({ ...trail, title })) }));
      draft.update({ trail: { title } });
      return Promise.resolve();
    }
    pend(`trail-title:${trailId}`, renameTrailOp(trailId, title));
    return pendingSaves.current.track(`trail-title:${trailId}`, () => optimistic(`trail-title:${trailId}`, renameTrailOp(trailId, title),
      () => renameTrail(trailId, title, restoreEpoch), true), true).catch(() => {});
  };

  const handleRenameItem = (itemId: string, title: string) => {
    const result = draft?.backup.result;
    if (result && itemId === draft.editorKey) itemId = String(result.itemId);
    if (draft && draft.getSnapshot().status !== 'saved') {
      setRemote(previous => ({ ...previous, items: Object.fromEntries(Object.entries(previous.items).map(([id, item]) => [id, { ...item, title }])) }));
      draft.update({ item: { ...draft.backup.latest.item, title } }, true);
      return Promise.resolve();
    }
    pend(`title:${itemId}`, renameItem(itemId, title));
    titleSaves.update(result?.projectId ?? projectId, itemId, title, result?.restoreEpoch ?? restoreEpoch);
    return Promise.resolve();
  };

  const handleDeleteTrail = (trailId: string) => pendingSaves.current.track(`delete-trail:${trailId}`, async () => {
    const target = trails.find(trail => trail.id === trailId);
    if (!target) return;

    const next = trails.find(trail => trail.id !== trailId);
    await optimistic(`delete-trail:${trailId}`, removeTrail(trailId), () => deleteTrailRequest(trailId, restoreEpoch));
    if (activeTrailId === trailId) setNavigation({ trailId: next?.id, itemId: next?.itemIds[0] });
  }, false);

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
  };


  const handleRenameProject = (title: string) => {
    assertProjectText(title, 'title');
    if (draft && draft.getSnapshot().status !== 'saved') {
      setProjectTitle(title); draft.update({ project: { title } }); return Promise.resolve();
    }
    return pendingSaves.current.track("project-title", async () => {
      await renameProject(projectId, title, restoreEpoch);
      setProjectTitle(title);
    }, true);
  };

  const retryMapPreviews = useCallback(() => {
    setPreviewResult(null);
    void getMapPreviews(projectId).then((data) => setPreviewResult({ projectId, data })).catch(() => setPreviewResult({ projectId, data: null }));
  }, [projectId]);

  return {
    projectId,
    isDraft,
    draftError: draftState.error,
    retryDraft: draft?.retry,
    titleSaveError: titleState.error,
    retryItemTitles: titleSaves.retry,
    resolveProjectId: draft && (routeProjectId === 'new' || routeProjectId === draft.backup.result?.projectId) ? draft.resolveProjectId : undefined,
    onDraftProjectTitle: isDraft ? (title: string) => { void handleRenameProject(title); } : undefined,
    onDraftTrailTitle: isDraft ? (id: string, title: string) => { void handleRenameTrail(id, title); } : undefined,
    onDraftItemTitle: (id: string, title: string) => { void handleRenameItem(id, title); },
    loaded,
    restoreEpoch,
    projectTitle,
    visibility,
    description,
    setDescription,
    tags,
    setTags,
    profile,
    role,
    accessLost,
    noAccess: noAccessProjectId === routeProjectId,
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
    flushProjectChanges: async () => { await Promise.all([titleSaves.flush(), pendingSaves.current.flush()]); },
    applyExtraction: (result: ExtractionResult) => {
      updateItemContentLocally(result.item.id, result.item.content ?? '');
      settle(`extract:${result.item.id}`, compose(addItem(metaOf(result.item)),
        ...(result.trailId ? [linkItem(result.trailId, result.item.id), orderTrailItems(result.trailId, result.steps.map(step => step.itemId))] : [])));
    },
    receiveStructure,
    commitItemTitle,
    handleSetItemTitleAlign,
    handleSetGraphColors,
    handleSelectItem,
    handleReorderTrailItems,
    handleReorderTrails,
    trailOrderError,
    handleMoveItemToTrail,
    reorderNotices,
    dismissReorderNotice,
    handleCreateTrail,
    handleCreateItem,
    handleLinkItemToTrail,
    handleUnlinkItemFromTrail,
    handleCreateLooseItem,
    handleDeleteItem,
    handleRenameTrail,
    handleRenameItem,
    handleDeleteTrail,
    handleVisibilityChange,
    updateItemContentLocally,
    handleRenameProject,
    ...autoSave,
    onCollabChange: (itemId: string, editorState: import('lexical').EditorState) => {
      autoSave.onCollabChange?.(itemId, editorState);
      const title = editorState.read($noteTitle)?.trim();
      if (title === undefined) return;
      if (!title || title === remoteRef.current.items[itemId]?.title) drop(`live-title:${itemId}`);
      else settle(`live-title:${itemId}`, renameItem(itemId, title));
    },
    ...(isDraft ? { saveStatus: draftState.status === 'error' ? 'error' as const : draftState.status === 'draft' ? 'idle' as const : 'saving' as const,
      saveError: draftState.error } : {}),
    ...(!isDraft && titleState.status === 'error' ? { saveStatus: 'error' as const } : {}),
    onChange: (itemId: string, editorState: import('lexical').EditorState, pendingCommand = false) => {
      const state = draft ? editorState.toJSON() : undefined;
      draft?.setPendingImages(JSON.stringify(state).includes('"imageId":""'));
      if (draft && draft.getSnapshot().status !== 'saved') {
        const content = serializeNoteContent(state, false);
        const id = draft.backup.result ? String(draft.backup.result.itemId) : itemId;
        updateItemContentLocally(id, content);
        draft.update({ item: { ...draft.backup.latest.item, content } }, false, pendingCommand);
      }
    },
    collabHandoff,
    onCollabHandoff,
    refreshProject,
    onCopyUnsyncedText: unsyncedText === null ? undefined : async () => {
      await navigator.clipboard.writeText(unsyncedText);
      setUnsyncedText(null);
      draft?.completeHandoff();
    },
    ...(unsyncedText !== null ? { saveStatus: 'error' as const,
      saveError: 'This note changed in another tab before your last edits synced. Copy your text to add it back.' } : {}),
  };
}
