import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trail, Item, TitleAlign, Association, AssociationType, AssociationTargetType } from '../../types';
import { countTextStats, lastItemStorageKey } from '../../editor-utils';
import {
  getProject,
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
  updateStep,
  reorderTrailItems,
  tie,
  untie,
  type ProjectVisibility,
} from '@/lib/projects-store';
import { resolveItemTrail } from '../../trail-navigation';
import { getItemContent, getTrailContents } from '@/lib/item-content-client';
import { getMyProfile } from '@/lib/profile';
import type { GraphPreviewData } from '@/lib/feed';

export function useProjectEditorState(projectId: string) {
  const router = useRouter();

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
  const [tags, setTags] = useState('');
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(null);
  const [thumbnailGraph, setThumbnailGraph] = useState<GraphPreviewData | null>(null);

  const [trails, setTrails] = useState<Trail[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
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
    getMyProfile().then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProject(projectId).then(async (project) => {
      if (cancelled) return;
      if (!project) {
        router.replace('/projects');
        return;
      }
      setProjectTitle(project.title);
      setVisibility(project.visibility);
      setDescription(project.description);
      setTags(project.tags);
      setThumbnailImageUrl(project.thumbnailImageUrl);
      setThumbnailGraph(project.thumbnailGraph);
      setTrails(project.trails);
      setItems(project.items);
      setLoaded(true);

      const savedItemId = localStorage.getItem(lastItemStorageKey(projectId));
      const savedItem = savedItemId ? project.items[savedItemId] : undefined;
      const host = savedItem ? project.trails.find((t) => t.itemIds.includes(savedItem.id)) : undefined;
      const trail = host ?? project.trails[0];
      const itemId = savedItem?.id ?? trail?.itemIds[0] ?? Object.values(project.items)[0]?.id;
      setNavigation({ trailId: savedItem && !host ? undefined : trail?.id, itemId,
        request: itemId ? { itemId, sequence: ++navigationSequence.current, focus: false } : undefined });

    }).catch(() => {
      if (!cancelled) redirectToLogin();
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, router, redirectToLogin]);

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

  const associationById = useMemo(() => {
    const map = new Map<string, Association>();
    Object.values(items).forEach((it) => it.associations.forEach((a) => map.set(a.id, a)));
    return map;
  }, [items]);

  const handleUpdateAnnotation = async (trailId: string, itemId: string, annotation: string) => {
    const step = trails.find((t) => t.id === trailId)?.steps.find((s) => s.itemId === itemId);
    setTrails((prev) => prev.map((t) =>
      t.id === trailId
        ? { ...t, steps: t.steps.map((s) => (s.itemId === itemId ? { ...s, annotation } : s)) }
        : t
    ));
    await updateStep(trailId, itemId, { annotation, associationId: step?.associationId ?? null });
  };

  const commitItemTitle = (itemId: string, currentTitle: string, nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentTitle) return;
    handleRenameItem(itemId, trimmed);
  };

  const handleSetItemTitleAlign = async (itemId: string, titleAlign: TitleAlign) => {
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, titleAlign } };
    });
    await setItemTitleAlign(itemId, titleAlign);
  };

  const [contentLoadError, setContentLoadError] = useState(false);
  const [contentRetry, setContentRetry] = useState(0);
  const retryContent = () => setContentRetry((n) => n + 1);
  const trailContentIds = activeTrail?.itemIds.join('|');

  useEffect(() => {
    let cancelled = false;
    if (!activeTrailId) return;
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
  }, [activeTrailId, trailContentIds, contentRetry]);

  useEffect(() => {
    let cancelled = false;
    if (activeTrailId || !selectedItemId) return;
    getItemContent(selectedItemId).then((content) => {
      if (cancelled) return;
      setContentLoadError(false);
      setItems((prev) => prev[selectedItemId] && prev[selectedItemId].content == null
        ? { ...prev, [selectedItemId]: { ...prev[selectedItemId], content, textStats: countTextStats(content) } } : prev);
    }).catch(() => { if (!cancelled) setContentLoadError(true); });
    return () => { cancelled = true; };
  }, [activeTrailId, selectedItemId, contentRetry]);

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

  const handleReorderTrailItems = async (trailId: string, itemIds: string[]) => {
    const previous = trails.find((trail) => trail.id === trailId);
    if (!previous) return;
    setTrails((prev) => prev.map((trail) => {
      if (trail.id !== trailId) return trail;
      const stepByItemId = new Map(trail.steps.map((step) => [step.itemId, step]));
      const steps = itemIds.flatMap((itemId) => {
        const step = stepByItemId.get(itemId);
        return step ? [step] : [];
      });
      if (steps.length !== trail.steps.length) return trail;
      return { ...trail, itemIds, steps };
    }));
    try {
      await reorderTrailItems(trailId, itemIds);
    } catch (err) {
      console.error(err);
      setTrails((prev) => prev.map((trail) =>
        trail.id === trailId ? { ...trail, itemIds: previous.itemIds, steps: previous.steps } : trail
      ));
    }
  };

  const handleCreateTrail = async (title: string) => {
    const newTrail = await createTrail(projectId, title);
    setTrails(prevTrails => [...prevTrails, newTrail]);
  };

  const handleCreateItem = async (trailId: string, title: string) => {
    const newItem = await createItem(trailId, title);
    setItems(prevItems => ({ ...prevItems, [newItem.id]: newItem }));
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId
        ? {
            ...trail,
            itemIds: [...trail.itemIds, newItem.id],
            steps: [...trail.steps, { itemId: newItem.id, annotation: null, associationId: null }],
          }
        : trail
    ));
    setView('write');
    setNavigation({ trailId, itemId: newItem.id, request: { itemId: newItem.id, sequence: ++navigationSequence.current, focus: true } });
  };

  const handleLinkItemToTrail = async (trailId: string, itemId: string) => {
    await attachItemToTrail(trailId, itemId);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId && !trail.itemIds.includes(itemId)
        ? {
            ...trail,
            itemIds: [...trail.itemIds, itemId],
            steps: [...trail.steps, { itemId, annotation: null, associationId: null }],
          }
        : trail
    ));
  };

  const handleUnlinkItemFromTrail = async (trailId: string, itemId: string) => {
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
  };

  const handleCreateLooseItem = async (title: string) => {
    const newItem = await createLooseItem(projectId, title);
    setItems(prevItems => ({ ...prevItems, [newItem.id]: newItem }));
    setView('write');
    setNavigation({ itemId: newItem.id, request: { itemId: newItem.id, sequence: ++navigationSequence.current, focus: true } });
  };

  const handleDeleteItem = async (itemId: string) => {
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
  };

  const handleRenameTrail = async (trailId: string, title: string) => {
    await renameTrail(trailId, title);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId ? { ...trail, title } : trail
    ));
  };

  const handleSetTrailDescription = async (trailId: string, description: string) => {
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId ? { ...trail, description } : trail
    ));
    await setTrailDescription(trailId, description);
  };

  const handleRenameItem = async (itemId: string, title: string) => {
    await renameItem(itemId, title);
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, title } };
    });
  };

  const handleDeleteTrail = async (trailId: string) => {
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
  };

  const handleTie = async (itemId: string, targetId: string, targetType: AssociationTargetType, type: AssociationType) => {
    await tie(itemId, targetId, targetType, type);
    const targetTitle = targetType === 'ITEM'
      ? items[targetId]?.title ?? ''
      : trails.find((t) => t.id === targetId)?.title ?? '';
    setItems((prev) => {
      const it = prev[itemId];
      if (!it) return prev;
      if (it.associations.some((a) => a.targetType === targetType && a.targetId === targetId)) {
        return prev;
      }
      const association: Association = { id: `tmp:${type}:${targetType}:${targetId}`, type, targetType, targetId, targetTitle };
      const linkedItemIds = targetType === 'ITEM' && !it.linkedItemIds.includes(targetId)
        ? [...it.linkedItemIds, targetId]
        : it.linkedItemIds;
      return { ...prev, [itemId]: { ...it, associations: [...it.associations, association], linkedItemIds } };
    });
  };

  const handleLinkItems = async (itemId: string, otherItemId: string) => {
    if (itemId === otherItemId) return;
    await handleTie(itemId, otherItemId, 'ITEM', 'RELATED');
    setItems((prev) => {
      const other = prev[otherItemId];
      if (!other || other.linkedItemIds.includes(itemId)) return prev;
      return { ...prev, [otherItemId]: { ...other, linkedItemIds: [...other.linkedItemIds, itemId] } };
    });
  };

  const handleUntie = async (itemId: string, targetId: string, targetType: AssociationTargetType) => {
    await untie(itemId, targetId, targetType);
    setItems((prev) => {
      const it = prev[itemId];
      if (!it) return prev;
      return {
        ...prev,
        [itemId]: {
          ...it,
          associations: it.associations.filter((a) => !(a.targetId === targetId && a.targetType === targetType)),
          linkedItemIds: targetType === 'ITEM' ? it.linkedItemIds.filter((id) => id !== targetId) : it.linkedItemIds,
        },
      };
    });
  };

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
    renameProject(projectId, title);
  };

  const handleThumbnailChange = useCallback((imageUrl: string | null, graph: GraphPreviewData | null) => {
    setThumbnailImageUrl(imageUrl);
    setThumbnailGraph(graph);
  }, []);

  return {
    loaded,
    projectTitle,
    visibility,
    description,
    setDescription,
    tags,
    setTags,
    thumbnailImageUrl,
    thumbnailGraph,
    handleThumbnailChange,
    profile,
    trails,
    items,
    selectedItem,
    selectedItemId,
    activeTrail,
    activeTrailId,
    view,
    setView,
    associationById,
    contentLoadError,
    retryContent,
    navigationRequest: navigation.request,
    handleVisibleItem,
    redirectToLogin,
    handleUpdateAnnotation,
    commitItemTitle,
    handleSetItemTitleAlign,
    handleSelectItem,
    handleReorderTrailItems,
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
    handleLinkItems,
    handleTie,
    handleUntie,
    handleVisibilityChange,
    updateItemContentLocally,
    handleRenameProject,
  };
}
