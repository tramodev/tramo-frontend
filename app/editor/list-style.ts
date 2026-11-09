// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { $getSelection, $getState, $isRangeSelection, $setState, createState, type LexicalNode } from 'lexical';
import { $insertList, $isListNode, type ListNode } from '@lexical/list';

export const multilevelState = createState('multilevel', { parse: (value) => value === true });

const $isNumberedList = (node: LexicalNode | null): node is ListNode =>
  $isListNode(node) && node.getListType() === 'number';

export const $isMultilevelList = (node: LexicalNode | null) =>
  $isNumberedList(node) && $getState(node, multilevelState);

export function $setNumberedList(multilevel: boolean) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if (!selection.getNodes().every((node) => $isNumberedList(node.getTopLevelElement()))) $insertList('number');
  const updated = $getSelection();
  if (!$isRangeSelection(updated)) return;
  for (const node of updated.getNodes()) {
    const list = node.getTopLevelElement();
    if ($isNumberedList(list)) $setState(list, multilevelState, multilevel);
  }
}
