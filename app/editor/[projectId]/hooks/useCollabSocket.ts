// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useMemo } from 'react';
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { useMounted } from '@/hooks/use-mounted';
import { COLLAB_SCHEMA, collabUrl } from '@/lib/collab-client';

export function useCollabSocket(enabled: boolean) {
  const mounted = useMounted();
  const socket = useMemo(() => mounted && enabled ? new HocuspocusProviderWebsocket({ url: `${collabUrl()}?schema=${COLLAB_SCHEMA}`, autoConnect: false }) : null, [mounted, enabled]);
  useEffect(() => {
    socket?.connect();
    return () => socket?.disconnect();
  }, [socket]);
  return socket;
}
