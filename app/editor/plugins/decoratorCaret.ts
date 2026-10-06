// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

export type Edge = 'before' | 'after';

export function $caretOnEdgeLine(
  node: LexicalNode,
  edge: Edge,
  editor: LexicalEditor,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const block = selection.anchor.getNode().getTopLevelElement();
  if (block === null) return false;
  const sibling = edge === 'after' ? block.getPreviousSibling() : block.getNextSibling();
  if (sibling !== node) return false;

  const blockDom = editor.getElementByKey(block.getKey());
  const domSelection = window.getSelection();
  if (blockDom === null || domSelection === null || domSelection.rangeCount === 0) return false;

  const caret = domSelection.getRangeAt(0).getBoundingClientRect();
  const box = blockDom.getBoundingClientRect();
  const slack = caret.height > 0 ? caret.height / 2 : 4;
  return edge === 'after' ? caret.top - box.top <= slack : box.bottom - caret.bottom <= slack;
}

export function $caretTouches(node: LexicalNode, edge: Edge): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const point = selection.anchor;
  const anchorNode = point.getNode();
  const sibling = edge === 'after' ? 'getPreviousSibling' : 'getNextSibling';

  if (point.type === 'text') {
    const atEdge = edge === 'after' ? point.offset === 0 : point.offset === anchorNode.getTextContentSize();
    if (!atEdge) return false;
    if (anchorNode[sibling]() === node) return true;
    const block = anchorNode.getTopLevelElement();
    return anchorNode[sibling]() === null && block !== null && block[sibling]() === node;
  }

  if (!$isElementNode(anchorNode)) return false;
  const neighbour = edge === 'after'
    ? anchorNode.getChildAtIndex(point.offset - 1)
    : anchorNode.getChildAtIndex(point.offset);
  if (neighbour === node) return true;
  const empty = anchorNode.getChildrenSize() === 0;
  return empty && anchorNode[sibling]() === node;
}
