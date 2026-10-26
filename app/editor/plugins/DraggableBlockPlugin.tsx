// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { GripVertical } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { $addUpdateTag, $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, HISTORY_PUSH_TAG, KEY_DOWN_COMMAND, createCommand } from 'lexical';
import { mergeRegister } from '@lexical/utils';

export const MOVE_BLOCK_COMMAND = createCommand<'up' | 'down'>('MOVE_BLOCK_COMMAND');

function $moveBlock(direction: 'up' | 'down'): boolean {
  const selection = $getSelection();
  const node = $isRangeSelection(selection) ? selection.anchor.getNode() : selection?.getNodes()[0];
  const block = node?.getTopLevelElement();
  const sibling = direction === 'up' ? block?.getPreviousSibling() : block?.getNextSibling();
  if (!block || !sibling) return false;
  $addUpdateTag(HISTORY_PUSH_TAG);
  if (direction === 'up') sibling.insertBefore(block);
  else sibling.insertAfter(block);
  return true;
}

const MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({ anchorElem }: { anchorElem: HTMLElement }) {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => mergeRegister(
    editor.registerCommand(MOVE_BLOCK_COMMAND, $moveBlock, COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_DOWN_COMMAND, event => {
      if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return false;
      event.preventDefault();
      editor.dispatchCommand(MOVE_BLOCK_COMMAND, event.key === 'ArrowUp' ? 'up' : 'down');
      return true;
    }, COMMAND_PRIORITY_LOW),
  ), [editor]);

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
