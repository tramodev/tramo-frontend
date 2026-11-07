// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import {
  $getPreviousSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $setSelection,
  $isElementNode,
  $isRangeSelection,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import { $insertNodeToNearestRoot } from '@lexical/utils';

export function $insertDecoratorNode(node: LexicalNode) {
  const selection = $getSelection() ?? $getPreviousSelection();
  if ($isNodeSelection(selection)) {
    $setSelection(selection.clone());
    $insertNodeToNearestRoot(node);
  } else {
    $insertNodes([node]);
  }
}

export const editingDecorators = new WeakMap<LexicalEditor, Set<string>>();

export function markDecoratorForEditing(editor: LexicalEditor, nodeKey: string) {
  const keys = editingDecorators.get(editor) ?? new Set<string>();
  keys.add(nodeKey);
  editingDecorators.set(editor, keys);
}

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
  if (caret.height === 0) return block.getTextContentSize() === 0;
  const box = blockDom.getBoundingClientRect();
  const slack = caret.height / 2;
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

export function textareaCaretRows(textarea: HTMLTextAreaElement) {
  const probe = textarea.cloneNode() as HTMLTextAreaElement;
  probe.removeAttribute('id');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = '0';
  probe.style.width = `${textarea.offsetWidth}px`;
  textarea.after(probe);
  const height = (text: string) => { probe.value = text; return probe.scrollHeight; };
  const { selectionStart: from, selectionEnd: to, value } = textarea;
  const before = value.slice(0, from) + value.slice(from).split(/\s/, 1)[0];
  const through = value.slice(0, to) + value.slice(to).split(/\s/, 1)[0];
  const rows = { first: height(before) <= height(''), last: height(through) >= height(value) };
  probe.remove();
  return rows;
}
