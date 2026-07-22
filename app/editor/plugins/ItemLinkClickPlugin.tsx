"use client"

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ITEM_LINK_REL_PREFIX, itemIdFromRel } from './itemLink';

export default function ItemLinkClickPlugin({ onNavigate }: { onNavigate: (itemId: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.(`a[rel^="${ITEM_LINK_REL_PREFIX}"], a[rel^="mypath-idea:"]`) as HTMLAnchorElement | null;
      if (!anchor) return;
      const itemId = itemIdFromRel(anchor.getAttribute('rel') ?? '');
      if (!itemId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onNavigateRef.current(itemId);
    };
    return editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener('click', handleClick, true);
      rootElement?.addEventListener('click', handleClick, true);
    });
  }, [editor]);

  return null;
}
