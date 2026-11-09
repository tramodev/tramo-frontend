// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createTextNode,
  $getEditor,
  $getRoot,
  $getSelection,
  $hasUpdateTag,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_CRITICAL,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_ENTER_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  RootNode,
  type LexicalEditor,
} from 'lexical';
import { $createTitleNode, $inTitle, $isTitleNode, $normalizeTitles, TITLE_MAX_LENGTH, TitleNode } from '@/app/editor/nodes/TitleNode';

const fromPeer = () => $hasUpdateTag(COLLABORATION_TAG) || $hasUpdateTag(HISTORIC_TAG);

export function $enforceTitleRoot(root: RootNode) {
  if (fromPeer() || $normalizeTitles(root)) return;
  const hadTitle = $getEditor().getEditorState().read(() => $isTitleNode($getRoot().getFirstChild()));
  if (!hadTitle) return;
  const title = $createTitleNode();
  const first = root.getFirstChild();
  if (first) first.insertBefore(title);
  else root.append(title);
  $normalizeTitles(root);
}

export function $enforceTitleText(title: TitleNode) {
  if (fromPeer()) return;
  for (const child of title.getChildren()) {
    if ($isTextNode(child) && child.getType() === 'text') {
      if (child.getFormat() !== 0) child.setFormat(0);
      if (child.getStyle() !== '') child.setStyle('');
    } else {
      child.replace($createTextNode(child.getTextContent().replace(/\s+/g, ' ')));
    }
  }
  const text = title.getTextContent();
  if (text.length > TITLE_MAX_LENGTH) {
    title.clear().append($createTextNode(text.slice(0, TITLE_MAX_LENGTH)));
    title.selectEnd();
  }
}

function $getTopBlock() {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed() ? selection.anchor.getNode().getTopLevelElement() : null;
}

function $atBlockEdge(edge: 'start' | 'end') {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const point = selection.anchor;
  const node = point.getNode();
  const block = node.getTopLevelElement();
  if (!block) return false;
  if (edge === 'start') return point.offset === 0 && (node === block || node === block.getFirstDescendant());
  return node === block ? point.offset === block.getChildrenSize() : node === block.getLastDescendant() && point.offset === node.getTextContentSize();
}

export function $guardTitleDelete(isBackward: boolean): boolean {
  const block = $getTopBlock();
  if (!block) return false;
  if (!isBackward) return $isTitleNode(block) && $atBlockEdge('end');
  const title = block.getPreviousSibling();
  if (!$isTitleNode(title) || !$isParagraphNode(block) || !$atBlockEdge('start')) return false;
  title.selectEnd();
  if (block.isEmpty() && block.getNextSibling()) block.remove();
  return true;
}

export function $enterBodyFromTitle(): boolean {
  if (!$inTitle()) return false;
  const selection = $getSelection();
  const title = $isRangeSelection(selection) ? selection.anchor.getNode().getTopLevelElement() : null;
  if (!$isTitleNode(title)) return false;
  const next = title.getNextSibling();
  if ($isElementNode(next)) next.selectStart();
  else title.insertNewAfter().selectStart();
  return true;
}

export function registerTitle(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(RootNode, $enforceTitleRoot),
    editor.registerNodeTransform(TitleNode, $enforceTitleText),
    editor.registerCommand(KEY_ENTER_COMMAND, event => {
      if (!$enterBodyFromTitle()) return false;
      event?.preventDefault();
      return true;
    }, COMMAND_PRIORITY_CRITICAL),
    ...[FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, INSERT_TAB_COMMAND]
      .map(command => editor.registerCommand(command, () => $inTitle(), COMMAND_PRIORITY_CRITICAL)),
    ...[DELETE_CHARACTER_COMMAND, DELETE_WORD_COMMAND, DELETE_LINE_COMMAND]
      .map(command => editor.registerCommand(command, $guardTitleDelete, COMMAND_PRIORITY_CRITICAL)),
    editor.registerCommand(PASTE_COMMAND, event => {
      const selection = $getSelection();
      if (!$inTitle() || !$isRangeSelection(selection)) return false;
      const text = 'clipboardData' in event && event.clipboardData ? event.clipboardData.getData('text/plain') : '';
      event.preventDefault();
      selection.insertText(text.replace(/\s+/g, ' '));
      return true;
    }, COMMAND_PRIORITY_CRITICAL),
  );
}

export default function TitlePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerTitle(editor), [editor]);
  return null;
}
