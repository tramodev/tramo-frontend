// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { Item } from '@/app/editor/types';
import { collectPlainText } from '@/app/editor/editor-utils';
import { ConnectionComment } from '@/components/editor/connection-comment';
import { getItemContent } from '@/lib/item-content-client';
import { ITEM_LINK_REL_PREFIX, itemIdFromRel } from './itemLink';

function briefPreview(content: string | null) {
  if (!content) return 'No preview available.';
  try {
    const text = collectPlainText(content).join(' ').replace(/\s+/g, ' ').trim();
    return text.length > 180 ? `${text.slice(0, 180).trimEnd()}...` : text || 'No preview available.';
  } catch {
    return 'No preview available.';
  }
}

export default function ItemLinkClickPlugin({ items, sourceId, onNavigate, onTie, onUpdateAssociation }: {
  items?: Record<string, Item>;
  sourceId?: string;
  onNavigate: (itemId: string) => void;
  onTie?: (sourceId: string, targetId: string, text: string) => Promise<void>;
  onUpdateAssociation?: (itemId: string, associationId: string, text: string) => Promise<void>;
}) {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState<{ targetId: string; left: number; top: number } | null>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.(`a[rel^="${ITEM_LINK_REL_PREFIX}"], a[rel^="mypath-idea:"]`) as HTMLAnchorElement | null;
      if (!anchor) return;
      const itemId = itemIdFromRel(anchor.getAttribute('rel') ?? '');
      if (!itemId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!items?.[itemId] || !sourceId || !onTie || !onUpdateAssociation) {
        onNavigate(itemId);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setOpen({ targetId: itemId, left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 280)) });
      setPreview(items[itemId].content ? briefPreview(items[itemId].content) : 'Loading preview…');
    };
    return editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener('click', handleClick, true);
      rootElement?.addEventListener('click', handleClick, true);
    });
  }, [editor, items, sourceId, onTie, onUpdateAssociation, onNavigate]);

  const targetId = open?.targetId;
  useEffect(() => {
    if (!targetId || items?.[targetId]?.content) return;
    let cancelled = false;
    void getItemContent(targetId).then(content => {
      if (!cancelled) setPreview(briefPreview(content));
    }).catch(() => {
      if (!cancelled) setPreview('Preview unavailable.');
    });
    return () => { cancelled = true; };
  }, [targetId, items]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('[data-item-connection-popover], a[rel^="tramo-idea:"], a[rel^="mypath-idea:"]')) return;
      setOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    const closeOnScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-item-connection-popover]')) return;
      setOpen(null);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [open]);

  const target = open && items?.[open.targetId];
  if (!open || !target || !sourceId || !onTie || !onUpdateAssociation || !items) return null;
  return createPortal(<div data-item-connection-popover role="dialog" aria-label={`Connection to ${target.title}`} className="fixed z-50 w-80 max-w-[calc(100vw-16px)] space-y-3 rounded-lg border border-border bg-popover p-4 shadow-elevation-2" style={{ left: open.left, top: open.top }}>
    <div className="flex items-start justify-between gap-2"><div className="font-medium">{target.title}</div><button type="button" aria-label="Close note preview" onClick={() => setOpen(null)} className="text-muted-foreground hover:text-foreground">×</button></div>
    <p className="line-clamp-3 text-sm text-muted-foreground">{preview}</p>
    <button type="button" autoFocus className="text-sm text-primary" onClick={() => { setOpen(null); onNavigate(target.id); }}>Open note</button>
    <div className="border-t border-border pt-3"><ConnectionComment key={`${sourceId}:${target.id}`} items={items} sourceId={sourceId} targetId={target.id} onTie={onTie} onUpdateAssociation={onUpdateAssociation} /></div>
  </div>, document.body);
}
