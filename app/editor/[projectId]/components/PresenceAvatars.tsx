// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { AuthorAvatar } from '@/components/shared/author-avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cursorColor } from '@/lib/collab-client';
import type { Item } from '@/app/editor/types';
import type { Peer } from '@/app/editor/presence';

const VISIBLE = 5;
const ROLE_LABELS = { OWNER: 'Owner', EDITOR: 'Editor', VIEWER: 'Viewer' } as const;

export function presenceLabel(peer: Peer, items: Record<string, Item>) {
  const item = peer.itemId && Object.hasOwn(items, peer.itemId) ? items[peer.itemId] : null;
  const title = item ? item.title || 'Untitled note' : null;
  if (peer.status === 'idle') return `Idle for ${Math.max(1, Math.round(peer.idleMs / 60_000))} min`;
  if (peer.status === 'writing') return title ? `Writing in ${title}` : 'Writing';
  return title ? `Viewing ${title}` : 'Viewing';
}

function PeerAvatar({ peer, size }: { peer: Peer; size: number }) {
  const color = cursorColor(peer.user.id);
  return <span className={`relative inline-flex rounded-full ${peer.status === 'idle' ? 'opacity-50' : ''}`}>
    <AuthorAvatar username={peer.user.name} avatar={peer.user.imageUrl} size={size} />
    {peer.status !== 'idle' && <span aria-hidden="true"
      className={`pointer-events-none absolute -inset-0.5 rounded-full border-2 ${peer.status === 'writing' ? 'motion-safe:animate-pulse' : ''}`}
      style={{ borderColor: color }} />}
  </span>;
}

export function PresenceAvatars({ peers, items, onSelect }: {
  peers: Peer[];
  items: Record<string, Item>;
  onSelect: (peer: Peer) => void;
}) {
  if (peers.length === 0) return null;
  const visible = peers.slice(0, VISIBLE);
  const rest = peers.slice(VISIBLE);
  return <div className="flex items-center gap-1.5" role="group" aria-label="People in this project">
    {visible.map(peer => {
      const name = peer.self ? 'You' : peer.user.name;
      const status = presenceLabel(peer, items);
      return <Tooltip key={peer.user.id}>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`${name}, ${status}`} aria-disabled={peer.self || undefined}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:cursor-default"
            onClick={peer.self ? undefined : () => onSelect(peer)}>
            <PeerAvatar peer={peer} size={28} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{name} · {ROLE_LABELS[peer.role]}</p>
          <p>{status}</p>
        </TooltipContent>
      </Tooltip>;
    })}
    {rest.length > 0 && <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${rest.length} more people`}
          className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          +{rest.length}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {rest.map(peer => <DropdownMenuItem key={peer.user.id} onSelect={() => onSelect(peer)}>
          <PeerAvatar peer={peer} size={22} />
          <span className="flex flex-col">
            <span>{peer.user.name} · {ROLE_LABELS[peer.role]}</span>
            <span className="text-xs text-muted-foreground">{presenceLabel(peer, items)}</span>
          </span>
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>}
  </div>;
}
