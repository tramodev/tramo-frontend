"use client"

import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { GripVertical } from 'lucide-react';
import { useRef } from 'react';

const MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({ anchorElem }: { anchorElem: HTMLElement }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

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
