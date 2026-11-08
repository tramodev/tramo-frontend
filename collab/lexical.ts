// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { createHeadlessEditor } from '@lexical/headless';
import {
  createBindingV2__EXPERIMENTAL,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsStateToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import { $createParagraphNode, $createTextNode, $getRoot, $parseSerializedNode, type LexicalEditor, type SerializedLexicalNode } from 'lexical';
import * as Y from 'yjs';
import { editorConfig } from '@/app/editor/lexical-config';
import { $createTitleNode, $isTitleNode, $noteTitle, TITLE_TYPE } from '@/app/editor/nodes/TitleNode';

type Json = { [key: string]: unknown };
type Provider = Parameters<typeof syncYjsStateToLexicalV2__EXPERIMENTAL>[1];

const provider = {
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    on() {},
    off() {},
    setLocalState() {},
    setLocalStateField() {},
  },
  connect() {},
  disconnect() {},
  on() {},
  off() {},
} as unknown as Provider;

function headless(): LexicalEditor {
  return createHeadlessEditor({
    namespace: editorConfig.namespace,
    nodes: editorConfig.nodes,
    onError: error => { throw error; },
  });
}

function bind(editor: LexicalEditor, doc: Y.Doc) {
  return createBindingV2__EXPERIMENTAL(editor, 'note', doc, new Map([['note', doc]]));
}

export function canonicalize(content: string): string {
  const editor = headless();
  const defaults = new Map<string, Json>();
  const defaultsFor = (type: string): Json => {
    let value = defaults.get(type);
    if (!value) {
      editor.update(() => {
        const klass = editor._nodes.get(type)?.klass;
        value = (type === 'root' ? $getRoot().exportJSON() : klass ? new klass().exportJSON() : {}) as unknown as Json;
      }, { discrete: true });
      defaults.set(type, value!);
    }
    return value!;
  };
  const fill = (node: Json) => {
    for (const [key, value] of Object.entries(defaultsFor(String(node.type)))) {
      if (!(key in node)) node[key] = structuredClone(value);
    }
    if (Array.isArray(node.children)) node.children.forEach(child => fill(child as Json));
  };
  const state = JSON.parse(content) as { root: Json };
  fill(state.root);
  return JSON.stringify(state);
}

function syncing(doc: Y.Doc, load?: (editor: LexicalEditor) => void): LexicalEditor {
  const editor = headless();
  const binding = bind(editor, doc);
  if (load) load(editor);
  else syncYjsStateToLexicalV2__EXPERIMENTAL(binding, provider);
  editor.registerUpdateListener(({ prevEditorState, editorState, dirtyElements, normalizedNodes, tags }) =>
    syncLexicalUpdateToYjsV2__EXPERIMENTAL(binding, provider, prevEditorState, editorState, dirtyElements, normalizedNodes, tags));
  return editor;
}

function $placeTitle(title: string) {
  const root = $getRoot();
  const first = root.getFirstChild();
  const node = $isTitleNode(first) ? first : $createTitleNode();
  if (node !== first) {
    if (first) first.insertBefore(node);
    else root.append(node);
  }
  if (node.getTextContent() !== title) {
    node.clear();
    if (title) node.append($createTextNode(title));
  }
  if (!node.getNextSibling()) root.append($createParagraphNode());
}

export function toYjs(content: string, title = ''): Uint8Array {
  const doc = new Y.Doc();
  const editor = syncing(doc, editor => {
    if (content.trim()) editor.setEditorState(editor.parseEditorState(canonicalize(content)));
  });
  editor.update(() => {
    $placeTitle(title);
    $getRoot().markDirty();
  }, { discrete: true });
  return Y.encodeStateAsUpdate(doc);
}

export function toLexical(doc: Y.Doc): { content: string; title: string } {
  const editor = headless();
  syncYjsStateToLexicalV2__EXPERIMENTAL(bind(editor, doc), provider);
  const state = editor.getEditorState();
  const json = state.toJSON();
  json.root.children = json.root.children.filter(child => child.type !== TITLE_TYPE);
  return { content: JSON.stringify(json), title: state.read(() => $noteTitle() ?? '') };
}

export function replaceContent(doc: Y.Doc, content: string) {
  const children = content.trim() ? JSON.parse(canonicalize(content)).root.children as SerializedLexicalNode[] : [];
  syncing(doc).update(() => {
    const root = $getRoot();
    root.getChildren().forEach((child, index) => { if (index > 0 || !$isTitleNode(child)) child.remove(); });
    if (children.length) root.append(...children.map($parseSerializedNode));
    else root.append($createParagraphNode());
  }, { discrete: true });
}

export function setTitle(doc: Y.Doc, title: string) {
  syncing(doc).update(() => $placeTitle(title), { discrete: true });
}
