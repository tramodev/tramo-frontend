// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { $getSelection, $isRangeSelection } from 'lexical';
import { $isCodeNode } from '@lexical/code';

export function $isSelectionInCode(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  return $isCodeNode(selection.anchor.getNode().getTopLevelElement());
}
