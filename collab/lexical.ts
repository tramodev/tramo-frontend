// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { createHeadlessEditor } from '@lexical/headless';
import {
  createBindingV2__EXPERIMENTAL,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsStateToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import { $getRoot, type LexicalEditor } from 'lexical';
import * as Y from 'yjs';
import { editorConfig } from '@/app/editor/lexical-config';

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

export function toYjs(content: string): Uint8Array {
  const doc = new Y.Doc();
  if (content.trim()) {
    const editor = headless();
    const binding = bind(editor, doc);
    editor.registerUpdateListener(({ prevEditorState, editorState, dirtyElements, normalizedNodes, tags }) =>
      syncLexicalUpdateToYjsV2__EXPERIMENTAL(binding, provider, prevEditorState, editorState, dirtyElements, normalizedNodes, tags));
    editor.setEditorState(editor.parseEditorState(canonicalize(content)));
    editor.update(() => $getRoot().markDirty(), { discrete: true });
  }
  return Y.encodeStateAsUpdate(doc);
}

export function toLexical(doc: Y.Doc): string {
  const editor = headless();
  syncYjsStateToLexicalV2__EXPERIMENTAL(bind(editor, doc), provider);
  return JSON.stringify(editor.getEditorState().toJSON());
}
