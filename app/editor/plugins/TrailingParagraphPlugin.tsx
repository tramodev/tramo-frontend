// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalNode,
} from 'lexical';
import { $isCodeNode } from '@lexical/code';

function $appendTrailingParagraph(): boolean {
  const root = $getRoot();
  const last = root.getLastChild();
  if ($isParagraphNode(last) && last.isEmpty()) {
    last.select();
    return false;
  }
  const paragraph = $createParagraphNode();
  root.append(paragraph);
  paragraph.select();
  return true;
}

function $codeBlockAtBoundary(direction: 'up' | 'down'): LexicalNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;

  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();
  const block = anchorNode.getTopLevelElement();
  if (!$isCodeNode(block)) return null;

  const atEdge =
    direction === 'down'
      ? anchor.offset === anchorNode.getTextContentSize() && anchorNode.getNextSibling() === null
      : anchor.offset === 0 && anchorNode.getPreviousSibling() === null;
  return atEdge ? block : null;
}

function $selectSibling(sibling: LexicalNode, edge: 'start' | 'end'): void {
  if ($isElementNode(sibling)) {
    if (edge === 'start') sibling.selectStart();
    else sibling.selectEnd();
    return;
  }
  if (edge === 'start') sibling.selectNext(0, 0);
  else sibling.selectPrevious();
}

function getCaretRect(): DOMRect | null {
  const domSelection = window.getSelection();
  if (domSelection === null || domSelection.rangeCount === 0) return null;
  const range = domSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.height > 0) return rect;
  const clientRects = range.getClientRects();
  if (clientRects.length > 0) return clientRects[0];
  const container = range.startContainer;
  const element =
    container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
  return element?.getBoundingClientRect() ?? null;
}

export default function TrailingParagraphPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (event.target !== editor.getRootElement()) return false;
          const last = $getRoot().getLastChild();
          const lastElement = last === null ? null : editor.getElementByKey(last.getKey());
          if (lastElement !== null && event.clientY <= lastElement.getBoundingClientRect().bottom) {
            return false;
          }
          return $appendTrailingParagraph();
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (event.altKey) return false;
          const code = $codeBlockAtBoundary('up');
          if (code === null) return false;
          const previous = code.getPreviousSibling();
          if (previous === null) return false;
          event.preventDefault();
          $selectSibling(previous, 'end');
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (event.altKey) return false;
          if (document.querySelector('.item-mention-menu') !== null) return false;

          const code = $codeBlockAtBoundary('down');
          if (code !== null) {
            const next = code.getNextSibling();
            event.preventDefault();
            if (next === null) return $appendTrailingParagraph();
            $selectSibling(next, 'start');
            return true;
          }

          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

          const block = selection.anchor.getNode().getTopLevelElement();
          if (block === null || block !== $getRoot().getLastChild()) return false;

          const blockElement = editor.getElementByKey(block.getKey());
          if (blockElement === null) return false;

          const caretRect = getCaretRect();
          if (caretRect === null) return false;

          const blockRect = blockElement.getBoundingClientRect();
          if (blockRect.bottom - caretRect.bottom >= caretRect.height) return false;

          if ($isParagraphNode(block) && block.isEmpty()) return false;
          event.preventDefault();
          return $appendTrailingParagraph();
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return null;
}
