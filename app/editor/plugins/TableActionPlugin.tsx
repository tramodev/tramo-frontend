// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $getSelection, $isRangeSelection, type ElementFormatType } from 'lexical';
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
  const visibleRect = element.closest('.editor-table-wrapper')?.getBoundingClientRect() ?? elementRect;
  if (elementRect.right - 22 < visibleRect.left || elementRect.right > visibleRect.right + 1) return null;

  const run = (action: () => void) => editor.update(action);
  const tableNode = () => {
    const cell = $getNodeByKey(cellKey);
    return cell ? $getTableNodeFromLexicalNodeOrThrow(cell) : null;
  };
  const deleteTable = () => tableNode()?.remove();
  const alignTable = (format: ElementFormatType) => tableNode()?.setFormat(format);

  return createPortal(
    <DropdownMenu>
      <DropdownMenuTrigger
        className="table-action-trigger"
        style={{ top: elementRect.top - anchorRect.top + 4, left: elementRect.right - anchorRect.left - 22 }}
        aria-label="Table actions"
      >
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={event => {
        event.preventDefault();
        editor.getRootElement()?.focus({ preventScroll: true });
        editor.focus();
      }}>
        <DropdownMenuItem onSelect={() => run(() => $insertTableRowAtSelection(false))}>Insert row above</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableRowAtSelection(true))}>Insert row below</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableColumnAtSelection(false))}>Insert column left</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $insertTableColumnAtSelection(true))}>Insert column right</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run(() => alignTable(''))}>Align table left</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => alignTable('center'))}>Align table center</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => alignTable('right'))}>Align table right</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run(() => $deleteTableRowAtSelection())}>Delete row</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => $deleteTableColumnAtSelection())}>Delete column</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => run(deleteTable)}>Delete table</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
    anchor,
  );
}
