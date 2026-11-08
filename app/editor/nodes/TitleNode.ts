// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  type ParagraphNode,
  type RangeSelection,
  type RootNode,
  type SerializedElementNode,
} from 'lexical';

export const TITLE_TYPE = 'note-title';
export const TITLE_MAX_LENGTH = 255;

export class TitleNode extends ElementNode {
  static getType(): string {
    return TITLE_TYPE;
  }

  static clone(node: TitleNode): TitleNode {
    return new TitleNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  static importJSON(json: SerializedElementNode): TitleNode {
    return $createTitleNode().updateFromJSON(json);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('h1');
    dom.className = 'note-title';
    dom.dataset.noteTitle = '';
    dom.dataset.placeholder = 'Untitled note';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  canBeEmpty(): boolean {
    return true;
  }

  canIndent(): boolean {
    return false;
  }

  collapseAtStart(): boolean {
    return false;
  }

  insertNewAfter(_selection?: RangeSelection, restoreSelection = true): ParagraphNode {
    const paragraph = $createParagraphNode();
    this.insertAfter(paragraph, restoreSelection);
    return paragraph;
  }
}

export function $createTitleNode(): TitleNode {
  return $applyNodeReplacement(new TitleNode());
}

export function $isTitleNode(node: LexicalNode | null | undefined): node is TitleNode {
  return node instanceof TitleNode;
}

export function $normalizeTitles(root: RootNode): TitleNode | null {
  const titles = root.getChildren().filter($isTitleNode);
  const title = titles.find(candidate => candidate.getTextContent().trim()) ?? titles[0];
  if (!title) return null;
  const kept = title.getTextContent().trim();
  for (const extra of titles.filter(candidate => candidate !== title)) {
    const text = extra.getTextContent().trim();
    if (!text || text === kept) extra.remove();
    else extra.replace($createParagraphNode(), true);
  }
  const first = root.getFirstChild();
  if (first && !first.is(title)) first.insertBefore(title);
  if (!title.getNextSibling()) root.append($createParagraphNode());
  return title;
}

export function $noteTitle(): string | null {
  const first = $getRoot().getFirstChild();
  return $isTitleNode(first) ? first.getTextContent() : null;
}

export function $inTitle(): boolean {
  const selection = $getSelection();
  return $isRangeSelection(selection)
    && ($isTitleNode(selection.anchor.getNode().getTopLevelElement()) || $isTitleNode(selection.focus.getNode().getTopLevelElement()));
}
