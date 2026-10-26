"use client"

import { useEffect, useRef, type ReactNode } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function menuPosition(caret: { top: number; bottom: number; left: number }, width: number, height: number, viewport: { top: number; left: number; width: number; height: number }) {
  const bottom = viewport.top + viewport.height - 8;
  const caretTop = Math.max(viewport.top + 8, Math.min(caret.top, bottom));
  const caretBottom = Math.max(caretTop, Math.min(caret.bottom, bottom));
  const above = Math.max(0, caretTop - viewport.top - 12);
  const below = Math.max(0, bottom - caretBottom - 4);
  const flip = below < Math.min(height, 240) && above > below;
  const maxHeight = Math.min(240, flip ? above : below);
  return {
    left: Math.max(viewport.left + 8, Math.min(caret.left, viewport.left + viewport.width - width - 8)),
    top: flip ? caretTop - Math.min(height, maxHeight) - 4 : caretBottom + 4,
    maxHeight,
  };
}

export function TypeaheadMenu({ children }: { children: ReactNode }) {
  const [editor] = useLexicalComposerContext();
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const root = editor.getRootElement();
    const menu = ref.current;
    if (!root || !menu) return;
    const previousRole = root.getAttribute('role');
    root.setAttribute('role', 'combobox');
    root.setAttribute('aria-expanded', 'true');
    const position = (event?: Event) => {
      if (event?.target instanceof Node && menu.contains(event.target)) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return;
      const caret = selection.getRangeAt(0).getBoundingClientRect();
      const viewport = window.visualViewport;
      const bounds = { top: viewport?.offsetTop ?? 0, left: viewport?.offsetLeft ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight };
      menu.style.maxWidth = `${Math.max(0, bounds.width - 16)}px`;
      const placed = menuPosition(caret, menu.offsetWidth, menu.scrollHeight, bounds);
      menu.style.left = `${placed.left}px`;
      menu.style.top = `${placed.top}px`;
      menu.style.maxHeight = `${placed.maxHeight}px`;
      menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    };
    position();
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      root.removeAttribute('aria-expanded');
      if (previousRole) root.setAttribute('role', previousRole);
      else root.removeAttribute('role');
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [editor, children]);
  return <ul ref={ref} role="presentation" className="item-mention-menu">{children}</ul>;
}
