// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { GripVertical } from 'lucide-react';
import { useEffect, useRef } from 'react';

const MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({ anchorElem }: { anchorElem: HTMLElement }) {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let animations: Animation[] = [];
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('application/x-lexical-drag-block')) return;
      cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel());
      animations = [];
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const root = editor.getRootElement();
      if (!root) return;
      const blocks = Array.from(root.children);
      const rootTop = root.getBoundingClientRect().top;
      const tops = blocks.map(block => block.getBoundingClientRect().top - rootTop);
      frame = requestAnimationFrame(() => {
        if (editor.getRootElement() !== root) return;
        const reordered = Array.from(root.children);
        if (blocks.length !== reordered.length || blocks.every((block, index) => block === reordered[index])) return;
        const nextRootTop = root.getBoundingClientRect().top;
        blocks.forEach((block, index) => {
          if (block.parentElement !== root || typeof block.animate !== 'function') return;
          const delta = tops[index] - (block.getBoundingClientRect().top - nextRootTop);
          if (!delta) return;
          animations.push(block.animate([
            { transform: `translateY(${delta}px)` },
            { transform: 'translateY(0)' },
          ], { duration: 180, easing: 'ease-out' }));
        });
      });
    };
    anchorElem.addEventListener('drop', onDrop, true);
    return () => {
      anchorElem.removeEventListener('drop', onDrop, true);
      cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel());
    };
  }, [anchorElem, editor]);

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div ref={menuRef} className={`${MENU_CLASSNAME} draggable-block-menu`}>
          <GripVertical className="h-4 w-4" />
        </div>
      }
      targetLineComponent={<div ref={targetLineRef} className="draggable-block-target-line" />}
      isOnMenu={isOnMenu}
    />
  );
}
