// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { CollaborationPluginV2__EXPERIMENTAL } from '@lexical/react/LexicalCollaborationPlugin';
import { HocuspocusProvider, type HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { cursorColor, fetchCollabToken } from '@/lib/collab-client';

export type CollabStatus = 'syncing' | 'synced' | 'offline';
export type CollabClosedReason = 'reload' | 'revoked';
type LexicalProvider = ComponentProps<typeof CollaborationPluginV2__EXPERIMENTAL>['provider'];

export default function CollaborationNotePlugin({ itemId, socket, username, userId, onStatus, onClosed }: {
  itemId: string;
  socket: HocuspocusProviderWebsocket;
  username: string;
  userId: string;
  onStatus: (itemId: string, status: CollabStatus | null) => void;
  onClosed: (reason: CollabClosedReason) => void;
}) {
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
  const callbacks = useRef({ onStatus, onClosed });
  useEffect(() => { callbacks.current = { onStatus, onClosed }; });

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
    provider.on('status', onStatusChange);
    provider.on('synced', report);
    provider.on('unsyncedChanges', report);
    provider.on('close', onClose);
    provider.on('authenticationFailed', onDenied);
    provider.attach();
    report();
    return () => {
      provider.off('status', onStatusChange);
      provider.off('synced', report);
      provider.off('unsyncedChanges', report);
      provider.off('close', onClose);
      provider.off('authenticationFailed', onDenied);
      provider.detach();
      callbacks.current.onStatus(itemId, null);
    };
  }, [connection, itemId]);

  const destroyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(destroyTimer.current);
    return () => { destroyTimer.current = setTimeout(() => connection.provider.destroy(), 0); };
  }, [connection]);

  return <CollaborationPluginV2__EXPERIMENTAL id={itemId} doc={connection.doc} provider={connection.lexicalProvider}
    username={username} cursorColor={cursorColor(userId)} />;
}
