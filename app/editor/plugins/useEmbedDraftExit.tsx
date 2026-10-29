'use client';

import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import type { Edge } from '@/app/editor/plugins/decoratorCaret';

export function useEmbedDraftExit({ enabled, dirty, commit, localOnly = false }: {
  enabled: boolean;
  dirty: boolean;
  localOnly?: boolean;
  commit: (edge: Edge | null, save?: boolean) => boolean | null | Promise<boolean | null>;
}, editing: RefObject<boolean>, textarea: RefObject<HTMLTextAreaElement | null>) {
  const root = useRef<HTMLElement | null>(null);
  const pending = useRef<HTMLElement | null>(null);
  const saving = useRef<Promise<boolean | null> | null>(null);

  const leave = useCallback(async (edge: Edge | null = 'after') => {
    if (!editing.current) return true;
    const attempt = saving.current ?? Promise.resolve(commit(edge));
    saving.current = attempt;
    const saved = await attempt;
    if (saving.current === attempt) saving.current = null;
    if (saved === false && editing.current) requestAnimationFrame(() => textarea.current?.focus());
    return saved === true;
  }, [commit, editing, textarea]);

  useLayoutEffect(() => {
    if (!enabled || !dirty || localOnly) return;
    pending.current = null;
    const outside = (event: MouseEvent) => {
      if (!editing.current || !(event.target instanceof Element) || root.current?.contains(event.target)
        || event.target.closest('[role="alertdialog"]')) return null;
      return event.target;
    };
    const remember = (event: MouseEvent) => {
      const target = outside(event);
      if (target) pending.current = target.closest<HTMLElement>('a[href], button, [role="button"], input, textarea, select');
    };
    const intercept = (event: MouseEvent) => {
      const target = outside(event);
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pending.current = target.closest<HTMLElement>('a[href], button, [role="button"], input, textarea, select') ?? pending.current;
      void leave(null).then(saved => {
        if (!saved) return;
        const action = pending.current;
        pending.current = null;
        requestAnimationFrame(() => { action?.focus(); action?.click(); });
      });
    };
    document.addEventListener('pointerdown', remember, true);
    document.addEventListener('click', intercept, true);
    return () => {
      document.removeEventListener('pointerdown', remember, true);
      document.removeEventListener('click', intercept, true);
    };
  }, [dirty, editing, enabled, leave, localOnly]);

  const attachRoot = useCallback((element: HTMLElement | null) => { root.current = element; }, []);

  return { attachRoot, leave, onBlur: (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget) && !(event.relatedTarget as Element | null)?.closest?.('[role="alertdialog"]')) void leave(null);
  } };
}
