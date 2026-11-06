// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { CollaborationPluginV2__EXPERIMENTAL } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isElementNode, $isParagraphNode, $isRangeSelection, $isRootNode, $isTextNode, $parseSerializedNode, type LexicalEditor, type LexicalNode } from 'lexical';
import { serializeNoteContent } from '@/app/editor/note-content';
import { HocuspocusProvider, type HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { cursorColor, fetchCollabToken } from '@/lib/collab-client';

export type CollabStatus = 'syncing' | 'synced' | 'offline';
export type CollabClosedReason = 'reload' | 'revoked';
export type CollabHandoff = { base: string; content: string };
type LexicalProvider = ComponentProps<typeof CollaborationPluginV2__EXPERIMENTAL>['provider'];
type Caret = { path: number[]; offset: number };

const carets = new Map<string, Caret>();

export function rememberCaret(editor: LexicalEditor, itemId: string) {
  const root = editor.getRootElement();
  if (!root || !root.contains(document.activeElement)) return;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const path: number[] = [];
    for (let node: LexicalNode | null = selection.focus.getNode(); node && !$isRootNode(node); node = node.getParent()) path.unshift(node.getIndexWithinParent());
    carets.set(itemId, { path, offset: selection.focus.offset });
  });
}

function restoreCaret(editor: LexicalEditor, itemId: string) {
  const caret = carets.get(itemId);
  carets.delete(itemId);
  if (!caret) return;
  editor.update(() => {
    let node: LexicalNode | null = $getRoot();
    for (const index of caret.path) node = $isElementNode(node) ? node.getChildAtIndex(index) : null;
    if ($isTextNode(node)) node.select(Math.min(caret.offset, node.getTextContentSize()), Math.min(caret.offset, node.getTextContentSize()));
    else if ($isElementNode(node)) node.select(Math.min(caret.offset, node.getChildrenSize()), Math.min(caret.offset, node.getChildrenSize()));
  });
  requestAnimationFrame(() => {
    editor.getRootElement()?.focus({ preventScroll: true });
    editor.focus();
  });
}

function applyHandoff(editor: LexicalEditor, handoff: CollabHandoff): boolean {
  const current = editor.getEditorState();
  const blank = current.read(() => $getRoot().getTextContent().trim() === '' && $getRoot().getChildren().every($isParagraphNode));
  const unchanged = handoff.base
    ? serializeNoteContent(editor.parseEditorState(handoff.base).toJSON()) === serializeNoteContent(current.toJSON())
    : blank;
  if (!unchanged) return false;
  if (handoff.content !== handoff.base) {
    const children = handoff.content ? JSON.parse(handoff.content).root.children : [];
    editor.update(() => { $getRoot().clear().append(...children.map($parseSerializedNode)); }, { discrete: true });
  }
  return true;
}

export default function CollaborationNotePlugin({ itemId, socket, username, userId, handoff, onHandoff, onStatus, onClosed }: {
  itemId: string;
  socket: HocuspocusProviderWebsocket;
  username: string;
  userId: string;
  handoff?: CollabHandoff | null;
  onHandoff?: (applied: boolean) => void;
  onStatus: (itemId: string, status: CollabStatus | null) => void;
  onClosed: (reason: CollabClosedReason) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const connection = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({ websocketProvider: socket, name: itemId, document: doc, token: () => fetchCollabToken(itemId) });
    const lexicalProvider = {
      awareness: provider.awareness,
      connect() {},
      disconnect() {},
      on: provider.on.bind(provider),
      off: provider.off.bind(provider),
    } as unknown as LexicalProvider;
    return { doc, provider, lexicalProvider };
  }, [itemId, socket]);
  const callbacks = useRef({ onStatus, onClosed, onHandoff, handoff });
  useEffect(() => { callbacks.current = { onStatus, onClosed, onHandoff, handoff }; });

  useEffect(() => {
    const { provider } = connection;
    let online = true;
    const report = () => callbacks.current.onStatus(itemId, !online ? 'offline'
      : provider.isSynced && provider.unsyncedChanges === 0 ? 'synced' : 'syncing');
    const onStatusChange = ({ status }: { status: string }) => { online = status === 'connected'; report(); };
    const onClose = ({ event }: { event: { reason?: string } }) => {
      if (event.reason === 'reload' || event.reason === 'revoked') callbacks.current.onClosed(event.reason);
    };
    const onDenied = () => callbacks.current.onClosed('revoked');
    let settled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const onSynced = () => {
      report();
      if (settled || !provider.isSynced) return;
      settled = true;
      settleTimer = setTimeout(() => {
        const { handoff, onHandoff } = callbacks.current;
        if (handoff) {
          let applied = false;
          try { applied = applyHandoff(editor, handoff); } catch {}
          onHandoff?.(applied);
        }
        restoreCaret(editor, itemId);
      }, 0);
    };
    provider.on('status', onStatusChange);
    provider.on('synced', onSynced);
    provider.on('unsyncedChanges', report);
    provider.on('close', onClose);
    provider.on('authenticationFailed', onDenied);
    provider.attach();
    report();
    return () => {
      provider.off('status', onStatusChange);
      clearTimeout(settleTimer);
      provider.off('synced', onSynced);
      provider.off('unsyncedChanges', report);
      provider.off('close', onClose);
      provider.off('authenticationFailed', onDenied);
      provider.detach();
      callbacks.current.onStatus(itemId, null);
    };
  }, [connection, itemId, editor]);

  const destroyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(destroyTimer.current);
    return () => { destroyTimer.current = setTimeout(() => connection.provider.destroy(), 0); };
  }, [connection]);

  return <LexicalCollaboration>
    <CollaborationPluginV2__EXPERIMENTAL id={itemId} doc={connection.doc} provider={connection.lexicalProvider}
      username={username} cursorColor={cursorColor(userId)} />
  </LexicalCollaboration>;
}
