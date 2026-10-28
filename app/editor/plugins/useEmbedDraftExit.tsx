'use client';

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { Edge } from '@/app/editor/plugins/decoratorCaret';

export function useEmbedDraftExit({ enabled, dirty, commit, label }: {
  enabled: boolean;
  dirty: boolean;
  commit: (edge: Edge | null, save?: boolean) => boolean | null | Promise<boolean | null>;
  label: string;
}, editing: RefObject<boolean>, textarea: RefObject<HTMLTextAreaElement | null>) {
  const [editor] = useLexicalComposerContext();
  const root = useRef<HTMLElement | null>(null);
  const pending = useRef<HTMLElement | null>(null);
  const saving = useRef<Promise<boolean | null> | null>(null);
  const [open, setOpen] = useState(false);

  const leave = useCallback(async (edge: Edge | null = 'after') => {
    if (!editing.current) return true;
    const attempt = saving.current ?? Promise.resolve(commit(edge));
    saving.current = attempt;
    const saved = await attempt;
    if (saving.current === attempt) saving.current = null;
    if (saved === false && editing.current) setOpen(true);
    return saved === true;
  }, [commit, editing]);

  useLayoutEffect(() => {
    if (!enabled || !dirty) return;
    pending.current = null;
    const outside = (event: MouseEvent) => {
      if (!editing.current || !(event.target instanceof Element) || root.current?.contains(event.target)
        || event.target.closest('[role="alertdialog"]')) return null;
      return event.target;
    };
    const remember = (event: MouseEvent) => {
      const target = outside(event);
      if (target) pending.current = target.closest<HTMLElement>('a[href], button, [role="button"]');
    };
    const intercept = (event: MouseEvent) => {
      const target = outside(event);
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pending.current = target.closest<HTMLElement>('a[href], button, [role="button"]') ?? pending.current;
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
  }, [dirty, editing, enabled, leave]);

  const requestDiscard = () => {
    pending.current = null;
    if (dirty) setOpen(true);
    else void commit('after', false);
  };

  const dialog = <ConfirmDialog open={open} title={`Discard unfinished ${label}?`}
    description="These changes have not been saved. Discarding removes your unfinished changes; previously saved content is kept."
    confirmLabel="Discard" cancelLabel="Continue editing"
    onOpenChange={next => {
      setOpen(next);
      if (!next) {
        pending.current = null;
        requestAnimationFrame(() => textarea.current?.focus());
      }
    }}
    onConfirm={() => {
      const action = pending.current;
      pending.current = null;
      void Promise.resolve(commit(action ? null : 'after', false)).then(() => {
        requestAnimationFrame(() => {
          if (action) {
            action.focus();
            action.click();
          } else {
            editor.getRootElement()?.focus({ preventScroll: true });
            editor.focus();
          }
        });
      });
    }} />;

  const attachRoot = useCallback((element: HTMLElement | null) => { root.current = element; }, []);

  return { attachRoot, leave, requestDiscard, dialog, onBlur: (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget) && !(event.relatedTarget as Element | null)?.closest?.('[role="alertdialog"]')) void leave(null);
  } };
}
