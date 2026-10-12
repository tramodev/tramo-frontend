import { useEffect, useState, type RefObject } from 'react';

export function useVirtualNotes(root: RefObject<HTMLElement | null>, slots: RefObject<Map<string, HTMLElement>>, ids: string[], ready: boolean) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const [selectionIds, setSelectionIds] = useState<Set<string>>(() => new Set());
  const [heights] = useState(() => new Map<string, number>());

  useEffect(() => {
    const update = () => {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode?.parentElement?.closest<HTMLElement>('section[data-item-id]');
      const focus = selection?.focusNode?.parentElement?.closest<HTMLElement>('section[data-item-id]');
      const from = ids.indexOf(anchor?.dataset.itemId ?? '');
      const to = ids.indexOf(focus?.dataset.itemId ?? '');
      const next = selection && !selection.isCollapsed && anchor && focus && from >= 0 && to >= 0 && root.current?.contains(anchor) && root.current.contains(focus)
        ? new Set(ids.slice(Math.min(from, to), Math.max(from, to) + 1)) : new Set<string>();
      setSelectionIds(previous => next.size === previous.size && [...next].every(id => previous.has(id)) ? previous : next);
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [root, ids]);

  useEffect(() => {
    const container = root.current;
    if (!ready || !container) return;
    const intersection = new IntersectionObserver(entries => {
      setVisibleIds(previous => {
        const next = new Set(previous);
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.itemId;
          if (!id) continue;
          if (entry.isIntersecting) next.add(id);
          else next.delete(id);
        }
        return next.size === previous.size && [...next].every(id => previous.has(id)) ? previous : next;
      });
    }, { root: container, rootMargin: '400px 0px' });
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const id = element.dataset.itemId;
        if (id && element.dataset.mounted === 'true') {
          const height = entry.borderBoxSize[0].blockSize;
          if (height > 0) heights.set(id, height);
        }
      }
    });
    for (const id of ids) {
      const element = slots.current.get(id);
      if (!element) continue;
      intersection.observe(element);
      resize.observe(element, { box: 'border-box' });
    }
    return () => { intersection.disconnect(); resize.disconnect(); };
  }, [root, slots, ids, ready, heights]);

  return { visibleIds, selectionIds, heights };
}
