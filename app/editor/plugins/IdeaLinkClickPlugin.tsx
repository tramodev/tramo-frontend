"use client"

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { IDEA_LINK_REL_PREFIX, ideaIdFromRel } from './ideaLink';

export default function IdeaLinkClickPlugin({ onNavigate }: { onNavigate: (ideaId: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.(`a[rel^="${IDEA_LINK_REL_PREFIX}"], a[rel^="mypath-idea:"]`) as HTMLAnchorElement | null;
      if (!anchor) return;
      const ideaId = ideaIdFromRel(anchor.getAttribute('rel') ?? '');
      if (!ideaId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onNavigateRef.current(ideaId);
    };
    return editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener('click', handleClick, true);
      rootElement?.addEventListener('click', handleClick, true);
    });
  }, [editor]);

  return null;
}
