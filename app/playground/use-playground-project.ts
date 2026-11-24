// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorState } from 'lexical';
import type { Item, TitleAlign } from '@/app/editor/types';
import { serializeNoteContent } from '@/app/editor/note-content';
import { countTextStats, searchableText } from '@/app/editor/editor-utils';
import { resolveItemTrail } from '@/app/editor/trail-navigation';
import { assertProjectText } from '@/lib/project-validation';
import { importPlayground, PLAYGROUND_STORAGE_KEY } from '@/app/playground/playground-import';
import { addItem, addTrail, alignItem, compose, followNavigation, linkItem, orderTrailItems, orderTrails, parseStructure, removeItem, removeTrail,
  renameItem, renameTrail, unlinkItem, type Structure, type StructureOp } from '@/app/editor/structure';

const SAVE_DEBOUNCE_MS = 600;
const QUOTA_ERROR = 'This browser ran out of space for the playground. Create an account to keep writing.';

type LoadedContent = { content: string; textStats: { words: number; characters: number } };
type Saved = { title: string; graphColors: string | null; structure: Structure; contents: Record<string, LoadedContent> };
type Navigation = { itemId?: string; trailId?: string; request?: { itemId: string; sequence: number; focus: boolean; embedIndex?: number } };

const UNTITLED = 'Untitled note';
const loadedContent = (content: string): LoadedContent => ({ content, textStats: countTextStats(content) });

function seed(): Saved {
  return {
    title: 'Playground',
    graphColors: null,
    structure: {
      version: 0, restoreEpoch: 0,
      items: { '1': { id: '1', title: UNTITLED, titleAlign: 'center', unfiled: false } },
      trails: [{ id: '2', title: 'My first trail', description: '', itemIds: ['1'], steps: [{ itemId: '1' }], version: 0, forkedFrom: null }],
    },
    contents: { '1': loadedContent('') },
  };
}

function load(): Saved {
  try {
    const data = JSON.parse(localStorage.getItem(PLAYGROUND_STORAGE_KEY) ?? 'null');
    const structure = parseStructure(JSON.stringify(data?.structure));
    if (!structure || typeof data.title !== 'string' || !data.contents || typeof data.contents !== 'object') return seed();
    const contents = Object.fromEntries(Object.keys(structure.items).map(id =>
      [id, loadedContent(typeof data.contents[id] === 'string' ? data.contents[id] : '')]));
    return { title: data.title.slice(0, 255), graphColors: typeof data.graphColors === 'string' ? data.graphColors : null, structure, contents };
  } catch {
    return seed();
  }
}

function serialize({ title, graphColors, structure, contents }: Saved) {
  return JSON.stringify({
    title,
    graphColors,
    structure: {
      version: 0, restoreEpoch: 0,
      items: Object.values(structure.items).map(item => ({ id: item.id, title: item.title, titleAlign: item.titleAlign, unfiled: item.unfiled, words: 0, characters: 0 })),
      trails: structure.trails.map(trail => ({ id: trail.id, title: trail.title, description: trail.description, version: 0, itemIds: trail.itemIds })),
    },
    contents: Object.fromEntries(Object.entries(contents).map(([id, { content }]) => [id, content])),
  });
}

function firstNavigation(structure: Structure): Navigation {
  const trail = structure.trails.find(candidate => candidate.itemIds.length);
  const itemId = trail?.itemIds[0] ?? Object.keys(structure.items)[0];
  return { itemId, trailId: trail?.id, request: itemId ? { itemId, sequence: 0, focus: true } : undefined };
}

export function usePlaygroundProject() {
  const [initial] = useState(load);
  const [projectTitle, setProjectTitle] = useState(initial.title);
  const [graphColors, setGraphColors] = useState(initial.graphColors);
  const [structure, setStructure] = useState(initial.structure);
  const [contents, setContents] = useState(initial.contents);
  const [view, setView] = useState<'write' | 'graph'>('write');
  const [saveError, setSaveError] = useState('');
  const [navigation, setNavigation] = useState(() => firstNavigation(initial.structure));
  const navigationSequence = useRef(0);
  const nextId = useRef(Math.max(0, ...[...Object.keys(initial.structure.items), ...initial.structure.trails.map(trail => trail.id)].map(Number)) + 1);
  const newId = () => String(nextId.current++);

  const pending = useRef<Saved | null>(null);
  const importing = useRef(false);
  const persist = useCallback(() => {
    if (!pending.current || importing.current) return;
    const saved = pending.current;
    pending.current = null;
    try {
      localStorage.setItem(PLAYGROUND_STORAGE_KEY, serialize(saved));
      setSaveError('');
    } catch {
      setSaveError(QUOTA_ERROR);
    }
  }, []);
  const saved = useMemo(() => ({ title: projectTitle, graphColors, structure, contents }), [projectTitle, graphColors, structure, contents]);
  useEffect(() => {
    pending.current = saved;
    const timer = setTimeout(persist, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [saved, persist]);
  useEffect(() => {
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [persist]);

  const contentsRef = useRef(contents);
  useEffect(() => { contentsRef.current = contents; }, [contents]);
  const searchItems = useCallback(async (query: string) => Object.entries(contentsRef.current)
    .filter(([, { content }]) => searchableText(content).includes(query)).map(([id]) => id), []);

  const trails = structure.trails;
  const items = useMemo(() => Object.fromEntries(Object.entries(structure.items).map(([id, meta]) =>
    [id, { ...meta, content: contents[id]?.content ?? '', textStats: contents[id]?.textStats }])) as Record<string, Item>, [structure, contents]);
  const selectedItemId = navigation.itemId;
  const activeTrailId = navigation.trailId;
  const selectedItem = selectedItemId ? items[selectedItemId] : undefined;
  const activeTrail = trails.find(trail => trail.id === activeTrailId);

  const apply = (op: StructureOp) => {
    const next = op(structure);
    setStructure(next);
    setNavigation(previous => followNavigation(previous, next));
  };

  const handleSelectItem = (item: Item, trailId?: string, embedIndex?: number) => {
    setView('write');
    const request = { itemId: item.id, sequence: ++navigationSequence.current, focus: true, embedIndex };
    setNavigation(previous => ({ itemId: item.id, trailId: resolveItemTrail(trails, item.id, previous.trailId, trailId), request }));
  };

  const handleSelectTrail = (trailId: string) => {
    const trail = trails.find(candidate => candidate.id === trailId);
    if (!trail) return;
    const first = trail.itemIds.map(id => items[id]).find(Boolean);
    if (first) handleSelectItem(first, trailId);
    else {
      setView('write');
      setNavigation({ trailId });
    }
  };

  const handleVisibleItem = useCallback((itemId: string) => {
    setNavigation(previous => previous.itemId === itemId ? previous : { ...previous, itemId });
  }, []);

  const createItem = (trailId: string | undefined, title: string) => {
    const id = newId();
    setContents(previous => ({ ...previous, [id]: loadedContent('') }));
    apply(addItem({ id, title: title.trim() || UNTITLED, titleAlign: 'center', unfiled: !trailId }, trailId));
    setView('write');
    setNavigation({ trailId, itemId: id, request: { itemId: id, sequence: ++navigationSequence.current, focus: true } });
  };

  const handleMoveItemToTrail = (sourceId: string, targetId: string, itemId: string, targetIndex?: number) => {
    const source = trails.find(trail => trail.id === sourceId);
    const target = trails.find(trail => trail.id === targetId);
    if (sourceId === targetId || !source?.itemIds.includes(itemId) || !target) return Promise.resolve();
    const existingIndex = target.itemIds.indexOf(itemId);
    const targetOrder = target.itemIds.filter(id => id !== itemId);
    const index = targetIndex === undefined
      ? existingIndex < 0 ? targetOrder.length : existingIndex
      : Math.max(0, Math.min(targetOrder.length, targetIndex - (existingIndex >= 0 && existingIndex < targetIndex ? 1 : 0)));
    targetOrder.splice(index, 0, itemId);
    apply(compose(linkItem(targetId, itemId), orderTrailItems(targetId, targetOrder), unlinkItem(sourceId, itemId)));
    setNavigation(previous => previous.trailId === sourceId && previous.itemId === itemId ? { ...previous, trailId: targetId } : previous);
    return Promise.resolve();
  };

  const handleUnlinkItemFromTrail = (trailId: string, itemId: string) => {
    const nextTrail = unlinkItem(trailId, itemId)(structure).trails.find(trail => trail.id === trailId);
    apply(unlinkItem(trailId, itemId));
    if (activeTrailId === trailId && selectedItemId === itemId) {
      const next = nextTrail?.itemIds[0];
      setNavigation({ trailId: next ? trailId : undefined, itemId: next ?? itemId });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    apply(removeItem(itemId));
    setContents(previous => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
  };

  const handleDeleteTrail = (trailId: string) => {
    const next = trails.find(trail => trail.id !== trailId);
    apply(removeTrail(trailId));
    if (activeTrailId === trailId) setNavigation({ trailId: next?.id, itemId: next?.itemIds[0] });
  };

  return {
    projectId: 'playground',
    projectTitle,
    graphColors,
    trails,
    items,
    selectedItem,
    selectedItemId,
    activeTrail,
    activeTrailId,
    view,
    setView,
    saveStatus: saveError ? 'error' as const : 'idle' as const,
    saveError,
    navigationRequest: navigation.request,
    handleVisibleItem,
    handleSelectItem,
    handleSelectTrail,
    handleCreateTrail: (title: string) => apply(addTrail({ id: newId(), title, description: '', itemIds: [], steps: [], version: 0, forkedFrom: null })),
    handleCreateItem: (trailId: string, title: string) => createItem(trailId, title),
    handleCreateLooseItem: (title: string) => createItem(undefined, title),
    handleLinkItemToTrail: (trailId: string, itemId: string) => apply(linkItem(trailId, itemId)),
    handleUnlinkItemFromTrail,
    handleDeleteItem,
    handleDeleteTrail,
    handleRenameTrail: (trailId: string, title: string) => apply(renameTrail(trailId, title)),
    handleRenameItem: (itemId: string, title: string) => { if (title.trim()) apply(renameItem(itemId, title)); },
    commitItemTitle: (itemId: string, currentTitle: string, nextValue: string) => {
      const trimmed = nextValue.trim();
      if (trimmed && trimmed !== currentTitle) apply(renameItem(itemId, trimmed));
    },
    handleSetItemTitleAlign: (itemId: string, titleAlign: TitleAlign) => apply(alignItem(itemId, titleAlign)),
    handleReorderTrailItems: (trailId: string, itemIds: string[]) => apply(orderTrailItems(trailId, itemIds)),
    handleReorderTrails: (trailIds: string[]) => apply(orderTrails(trailIds)),
    handleMoveItemToTrail,
    handleSetGraphColors: async (colors: string) => setGraphColors(colors),
    handleRenameProject: async (title: string) => {
      assertProjectText(title, 'title');
      setProjectTitle(title);
    },
    searchItems,
    saveToAccount: async () => {
      importing.current = true;
      try {
        return await importPlayground(serialize(saved));
      } catch (error) {
        importing.current = false;
        throw error;
      }
    },
    onChange: (itemId: string, editorState: EditorState) => {
      const content = serializeNoteContent(editorState.toJSON(), false);
      setContents(previous => previous[itemId]?.content === content ? previous : { ...previous, [itemId]: loadedContent(content) });
    },
  };
}
