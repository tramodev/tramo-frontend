// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $getSelection, $isRangeSelection } from 'lexical';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableSelection,
} from '@lexical/table';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TableActionPlugin() {
  const [editor] = useLexicalComposerContext();
  const [cellKey, setCellKey] = useState<string | null>(null);
  const [, reposition] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        const anchor = $isRangeSelection(selection) || $isTableSelection(selection) ? selection.anchor.getNode() : null;
        setCellKey(anchor ? $getTableCellNodeFromLexicalNode(anchor)?.getKey() ?? null : null);
      });
    });
  }, [editor]);

  const element = cellKey === null ? null : editor.getElementByKey(cellKey);

  useEffect(() => {
    if (element === null) return;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [element]);

  if (cellKey === null || element === null || !editor.isEditable()) return null;

  const anchor = element.closest<HTMLElement>('.editor-content-column');
  if (anchor === null) return null;

  const anchorRect = anchor.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const run = (action: () => void) => editor.update(action);
  const deleteTable = () => {
    const cell = $getNodeByKey(cellKey);
    if (cell) $getTableNodeFromLexicalNodeOrThrow(cell).remove();
  };

  return createPortal(
    <DropdownMenu>
      <DropdownMenuTrigger
        className="table-action-trigger"
        style={{ top: elementRect.top - anchorRect.top + 4, left: elementRect.right - anchorRect.left - 22 }}
        aria-label="Table actions"
      >
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => run(() => $insertTableRowAtSelection(false))}>Insert row above</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableRowAtSelection(true))}>Insert row below</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableColumnAtSelection(false))}>Insert column left</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableColumnAtSelection(true))}>Insert column right</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run(() => $deleteTableRowAtSelection())}>Delete row</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $deleteTableColumnAtSelection())}>Delete column</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => run(deleteTable)}>Delete table</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
    anchor,
  );
}
