// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { CollaborationPluginV2__EXPERIMENTAL } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getNearestNodeFromDOMNode, $getNodeByKey, $getRoot, $getSelection, $isDecoratorNode, $isElementNode, $isParagraphNode, $isRangeSelection, $isRootNode, $isTextNode, $parseSerializedNode, COMMAND_PRIORITY_CRITICAL, HISTORIC_TAG, REDO_COMMAND, UNDO_COMMAND, type LexicalEditor, type LexicalNode } from 'lexical';
import { serializeNoteContent } from '@/app/editor/note-content';
import { HocuspocusProvider, type HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { COLLAB_ACCESS_DENIED, cursorColor, fetchCollabToken, forgetCollabToken } from '@/lib/collab-client';
import { $isImageNode, ImageNode } from '@/app/editor/nodes/ImageNode';
import { $isTitleNode } from '@/app/editor/nodes/TitleNode';

export type CollabStatus = 'syncing' | 'synced' | 'offline';
export type CollabClosedReason = 'reload' | 'revoked';
export type CollabWaiting = 'connecting' | 'limit' | null;
export type CollabHandoff = { base: string; content: string };
type LexicalProvider = ComponentProps<typeof CollaborationPluginV2__EXPERIMENTAL>['provider'];
type Caret = { path: number[]; offset: number };

const LOCAL_PROPERTIES: ComponentProps<typeof CollaborationPluginV2__EXPERIMENTAL>['excludedProperties'] = new Map([[ImageNode, new Set(['__src'])]]);

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

function $embedPath(element: Element | null): number[] | null {
  const node = element instanceof HTMLTextAreaElement ? $getNearestNodeFromDOMNode(element) : null;
  if (!$isDecoratorNode(node)) return null;
  const path: number[] = [];
  for (let current: LexicalNode | null = node; current && !$isRootNode(current); current = current.getParent()) path.unshift(current.getIndexWithinParent());
  return path;
}

function $nodeAtPath(path: number[]): LexicalNode | null {
  let node: LexicalNode | null = $getRoot();
  for (const index of path) node = $isElementNode(node) ? node.getChildAtIndex(index) : null;
  return node;
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
  const blank = current.read(() => $getRoot().getChildren().filter(child => !$isTitleNode(child))
    .every(child => $isParagraphNode(child) && child.getTextContent().trim() === ''));
  const unchanged = handoff.base
    ? serializeNoteContent(editor.parseEditorState(handoff.base).toJSON()) === serializeNoteContent(current.toJSON())
    : blank;
  if (!unchanged) return false;
  if (handoff.content !== handoff.base) {
    const children = handoff.content ? JSON.parse(handoff.content).root.children : [];
    editor.update(() => {
      const root = $getRoot();
      root.getChildren().forEach(child => { if (!$isTitleNode(child)) child.remove(); });
      root.append(...children.map($parseSerializedNode));
    }, { discrete: true });
  }
  return true;
}

export default function CollaborationNotePlugin({ itemId, socket, username, userId, cursorsContainer, handoff, onHandoff, onWaiting, onStatus, onClosed }: {
  itemId: string;
  cursorsContainer: HTMLElement | null;
  socket: HocuspocusProviderWebsocket;
  username: string;
  userId: string;
  handoff?: CollabHandoff | null;
  onHandoff?: (applied: boolean) => void;
  onWaiting?: (waiting: CollabWaiting) => void;
  onStatus: (itemId: string, status: CollabStatus | null) => void;
  onClosed: (reason: CollabClosedReason) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const connection = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({ websocketProvider: socket, name: itemId, document: doc, token: () => fetchCollabToken(itemId), sessionAwareness: true });
    const lexicalProvider = {
      awareness: provider.awareness,
      connect() {},
      disconnect() {},
      on: provider.on.bind(provider),
      off: provider.off.bind(provider),
    } as unknown as LexicalProvider;
    return { doc, provider, lexicalProvider };
  }, [itemId, socket]);
  const callbacks = useRef({ onStatus, onClosed, onHandoff, onWaiting, handoff });
  useEffect(() => { callbacks.current = { onStatus, onClosed, onHandoff, onWaiting, handoff }; });

  useEffect(() => {
    let direction: typeof UNDO_COMMAND | typeof REDO_COMMAND = UNDO_COMMAND;
    const imageId = (key: string) => { const node = $getNodeByKey(key); return $isImageNode(node) ? node.getImageId() : null; };
    return mergeRegister(
      editor.registerCommand(UNDO_COMMAND, () => { direction = UNDO_COMMAND; return false; }, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(REDO_COMMAND, () => { direction = REDO_COMMAND; return false; }, COMMAND_PRIORITY_CRITICAL),
      editor.registerMutationListener(ImageNode, (mutations, { updateTags, prevEditorState }) => {
        if (!updateTags.has(HISTORIC_TAG)) return;
        const halfway = editor.read(() => [...mutations].some(([key, mutation]) => imageId(key) === '' && (direction === REDO_COMMAND
          ? mutation === 'created'
          : mutation === 'updated' && !!prevEditorState.read(() => imageId(key)))));
        if (halfway) editor.dispatchCommand(direction, undefined);
      }, { skipInitialization: true }),
    );
  }, [editor]);

  useEffect(() => {
    const { provider } = connection;
    let online = true;
    const report = () => callbacks.current.onStatus(itemId, !online ? 'offline'
      : provider.isSynced && provider.unsyncedChanges === 0 ? 'synced' : 'syncing');
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    const onStatusChange = ({ status }: { status: string }) => {
      if (status === 'connected') { clearTimeout(offlineTimer); offlineTimer = undefined; online = true; report(); }
      else if (status === 'disconnected' && !offlineTimer) offlineTimer = setTimeout(() => { online = false; report(); }, 1500);
    };
    const onBrowserOffline = () => onStatusChange({ status: 'disconnected' });
    const onBrowserOnline = () => { if (socket.status === 'connected') onStatusChange({ status: 'connected' }); };
    const onClose = ({ event }: { event: { reason?: string } }) => {
      if (event.reason === 'reload') callbacks.current.onClosed('reload');
      else if (event.reason === 'revoked') {
        forgetCollabToken(itemId);
        callbacks.current.onClosed('revoked');
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => { provider.detach(); provider.attach(); }, 0);
      }
      else if (event.reason === 'deleted') provider.detach();
    };
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const onDenied = ({ reason }: { reason: string }) => {
      if (reason !== 'limit') forgetCollabToken(itemId);
      if (reason === 'reload') { callbacks.current.onClosed('reload'); return; }
      if (reason === 'forbidden' || reason.includes(COLLAB_ACCESS_DENIED)) { callbacks.current.onClosed('revoked'); return; }
      online = false;
      report();
      if (reason === 'limit' && !settled) { clearTimeout(waitingTimer); callbacks.current.onWaiting?.('limit'); }
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { provider.detach(); provider.attach(); }, Math.min(1000 * 2 ** attempt++, 30000));
    };
    let settled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let cursorFrame: number | undefined;
    const redrawCursors = () => {
      if (cursorFrame !== undefined || (provider.awareness?.getStates().size ?? 0) < 2) return;
      cursorFrame = requestAnimationFrame(() => {
        cursorFrame = undefined;
        provider.awareness?.emit('update', [{ added: [], updated: [], removed: [] }, provider]);
      });
    };
    const resize = new ResizeObserver(redrawCursors);
    const unregisterRoot = editor.registerRootListener(root => {
      resize.disconnect();
      if (root) resize.observe(root);
    });
    const waitingTimer = setTimeout(() => { if (!settled) callbacks.current.onWaiting?.('connecting'); }, 1500);
    const onSynced = () => {
      if (provider.isSynced) { attempt = 0; online = true; }
      report();
      if (settled || !provider.isSynced) return;
      settled = true;
      clearTimeout(waitingTimer);
      callbacks.current.onWaiting?.(null);
      settleTimer = setTimeout(() => {
        const { handoff, onHandoff } = callbacks.current;
        if (handoff) {
          let applied = false;
          try { applied = applyHandoff(editor, handoff); } catch {}
          onHandoff?.(applied);
        }
        restoreCaret(editor, itemId);
        redrawCursors();
      }, 0);
    };
    const warnUnsynced = (event: BeforeUnloadEvent) => {
      if (provider.unsyncedChanges === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnUnsynced);
    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);
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
      if (cursorFrame !== undefined) cancelAnimationFrame(cursorFrame);
      unregisterRoot();
      resize.disconnect();
      clearTimeout(retryTimer);
      clearTimeout(offlineTimer);
      clearTimeout(waitingTimer);
      window.removeEventListener('beforeunload', warnUnsynced);
      window.removeEventListener('offline', onBrowserOffline);
      window.removeEventListener('online', onBrowserOnline);
      provider.off('synced', onSynced);
      provider.off('unsyncedChanges', report);
      provider.off('close', onClose);
      provider.off('authenticationFailed', onDenied);
      callbacks.current.onStatus(itemId, null);
    };
  }, [connection, itemId, editor, socket]);

  useEffect(() => {
    const { awareness } = connection.provider;
    if (!awareness || !cursorsContainer) return;
    const marks: HTMLElement[] = [];
    let published = 'null';
    let frame: number | undefined;
    const publish = () => {
      const root = editor.getRootElement();
      const active = root?.contains(document.activeElement) ? document.activeElement : null;
      const path = editor.read(() => $embedPath(active));
      const state = awareness.getLocalState();
      if (!state || JSON.stringify(path) === published) return;
      published = JSON.stringify(path);
      awareness.setLocalState({ ...state, awarenessData: { ...state.awarenessData, embed: path } });
    };
    const paint = () => {
      marks.splice(0).forEach(mark => mark.remove());
      awareness.getStates().forEach((state, id) => {
        const path = state.awarenessData?.embed;
        if (id === awareness.clientID || !Array.isArray(path)) return;
        const key = editor.read(() => $nodeAtPath(path)?.getKey());
        const host = key ? editor.getElementByKey(key) : null;
        const target = host?.querySelector('[data-embed-key]') ?? host;
        if (!target) return;
        const mark = document.createElement('span');
        mark.className = 'collab-embed-mark';
        mark.dataset.name = state.name;
        cursorsContainer.appendChild(mark);
        marks.push(mark);
        const rect = target.getBoundingClientRect();
        const base = mark.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };
        mark.style.cssText = `top:${rect.top - base.top}px;left:${rect.left - base.left}px;width:${rect.width}px;height:${rect.height}px;--collab-color:${state.color}`;
      });
    };
    const sync = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; publish(); paint(); });
    };
    const resize = new ResizeObserver(sync);
    let current: HTMLElement | null = null;
    const listen = (root: HTMLElement | null, on: boolean) => ['focusin', 'focusout'].forEach(type => on
      ? root?.addEventListener(type, sync)
      : root?.removeEventListener(type, sync));
    awareness.on('change', sync);
    return mergeRegister(
      editor.registerUpdateListener(sync),
      editor.registerRootListener(root => {
        listen(current, false);
        resize.disconnect();
        current = root;
        listen(current, true);
        if (root) resize.observe(root);
      }),
      () => {
        listen(current, false);
        resize.disconnect();
        awareness.off('change', sync);
        if (frame !== undefined) cancelAnimationFrame(frame);
        marks.forEach(mark => mark.remove());
        const state = awareness.getLocalState();
        if (state) awareness.setLocalState({ ...state, awarenessData: { ...state.awarenessData, embed: null } });
      },
    );
  }, [connection, cursorsContainer, editor]);

  const cursorsContainerRef = useMemo(() => ({ current: cursorsContainer }), [cursorsContainer]);

  const destroyTimer = useRef<{ connection: typeof connection; timer: ReturnType<typeof setTimeout> } | undefined>(undefined);
  useEffect(() => {
    if (destroyTimer.current?.connection === connection) clearTimeout(destroyTimer.current.timer);
    return () => { destroyTimer.current = { connection, timer: setTimeout(() => connection.provider.destroy(), 0) }; };
  }, [connection]);

  return <LexicalCollaboration>
    <CollaborationPluginV2__EXPERIMENTAL id={itemId} doc={connection.doc} provider={connection.lexicalProvider}
      username={username} cursorColor={cursorColor(userId)} excludedProperties={LOCAL_PROPERTIES} cursorsContainerRef={cursorsContainerRef} />
  </LexicalCollaboration>;
}
