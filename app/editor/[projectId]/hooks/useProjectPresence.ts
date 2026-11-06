// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HocuspocusProvider, type HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { COLLAB_ACCESS_DENIED, fetchProjectToken, forgetCollabToken, presenceDocument } from '@/lib/collab-client';
import { presencePeers, type Peer, type PresenceState } from '@/app/editor/presence';

type Local = Pick<PresenceState, 'user' | 'role' | 'itemId' | 'trailId'>;

const NO_PEERS: Peer[] = [];
const TYPING_THROTTLE_MS = 2000;
const ACTIVE_THROTTLE_MS = 10_000;

function createPeerStore() {
  let peers = NO_PEERS;
  const listeners = new Set<() => void>();
  return {
    get: () => peers,
    set(next: Peer[]) {
      peers = next;
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export function useProjectPresence(socket: HocuspocusProviderWebsocket | null, projectId: string, local: Local | null): Peer[] {
  const [store] = useState(createPeerStore);
  const localRef = useRef(local);
  const publishRef = useRef<() => void>(() => {});
  const selfId = local?.user.id;

  useEffect(() => {
    localRef.current = local;
  });
  useEffect(() => {
    publishRef.current();
  }, [local?.itemId, local?.trailId, local?.role, local?.user.name, local?.user.imageUrl]);

  useEffect(() => {
    if (!socket || !projectId || !selfId) return;
    const key = `project:${projectId}`;
    const activity = { typingAt: null as number | null, activeAt: Date.now(), hidden: document.visibilityState === 'hidden' };
    let provider: HocuspocusProvider | null = null;
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const recompute = () => store.set(provider ? presencePeers(provider.awareness?.getStates().values() ?? [], selfId, Date.now()) : NO_PEERS);
    let leaving = false;
    const publish = () => {
      const current = localRef.current;
      if (provider && current && !leaving) provider.awareness?.setLocalState({ ...current, ...activity, typingAt: current.role === 'VIEWER' ? null : activity.typingAt });
    };
    publishRef.current = publish;
    const teardown = () => {
      provider?.awareness?.off('change', recompute);
      provider?.destroy();
      provider = null;
      recompute();
    };
    const fail = (reason?: string) => {
      if (cancelled) return;
      if (reason !== 'limit') forgetCollabToken(key);
      teardown();
      clearTimeout(retryTimer);
      if (reason === COLLAB_ACCESS_DENIED) return;
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 60_000));
    };
    const connect = () => {
      fetchProjectToken(projectId).then(token => {
        const name = presenceDocument(token);
        if (cancelled) return;
        if (!name) return fail();
        provider = new HocuspocusProvider({ websocketProvider: socket, name, document: new Y.Doc(), token: () => fetchProjectToken(projectId), sessionAwareness: true });
        provider.on('synced', () => { attempt = 0; });
        provider.on('authenticationFailed', ({ reason }: { reason: string }) => fail(reason));
        provider.on('close', ({ event }: { event: { reason?: string } }) => { if (event.reason === 'revoked') fail(); });
        provider.awareness?.on('change', recompute);
        provider.attach();
        publish();
        recompute();
      }).catch((error: Error) => fail(error.name));
    };

    const touch = (typing: boolean) => {
      const now = Date.now();
      const typed = typing && (activity.typingAt === null || now - activity.typingAt >= TYPING_THROTTLE_MS);
      if (typed) activity.typingAt = now;
      if (!typed && now - activity.activeAt < ACTIVE_THROTTLE_MS) return;
      activity.activeAt = now;
      publish();
    };
    const onKey = (event: KeyboardEvent) => touch(!!(event.target as HTMLElement | null)?.closest?.('[contenteditable="true"]'));
    const onActivity = () => touch(false);
    const onVisibility = () => {
      activity.hidden = document.visibilityState === 'hidden';
      if (!activity.hidden) activity.activeAt = Date.now();
      publish();
    };
    const onPageHide = () => { leaving = true; };
    const onPageShow = () => {
      leaving = false;
      publish();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onActivity, true);
    window.addEventListener('scroll', onActivity, true);
    window.addEventListener('focusin', onActivity, true);
    document.addEventListener('visibilitychange', onVisibility);
    const tick = setInterval(recompute, 15_000);
    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(tick);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onActivity, true);
      window.removeEventListener('scroll', onActivity, true);
      window.removeEventListener('focusin', onActivity, true);
      document.removeEventListener('visibilitychange', onVisibility);
      publishRef.current = () => {};
      teardown();
    };
  }, [socket, projectId, selfId, store]);

  return useSyncExternalStore(store.subscribe, store.get, () => NO_PEERS);
}
