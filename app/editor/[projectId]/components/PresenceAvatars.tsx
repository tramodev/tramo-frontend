// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { AuthorAvatar } from '@/components/shared/author-avatar';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cursorColor } from '@/lib/collab-client';
import type { Item } from '@/app/editor/types';
import type { Peer } from '@/app/editor/presence';

const VISIBLE = 5;
const STACKED = 2;
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
  const [open, setOpen] = useState(false);
  if (peers.length === 0) return null;
  const visible = peers.slice(0, VISIBLE);
  const rest = peers.slice(VISIBLE);
  return <>
    <button type="button" aria-label={`${peers.length} ${peers.length === 1 ? 'person' : 'people'} in this project, show everyone`} aria-haspopup="dialog" onClick={() => setOpen(true)}
      className="flex items-center justify-center -space-x-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden">
      {peers.slice(0, STACKED).map(peer => <span key={peer.user.id} className="flex rounded-full ring-2 ring-background"><PeerAvatar peer={peer} size={24} /></span>)}
      {peers.length > STACKED && <span className="relative flex size-6 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-medium text-muted-foreground ring-2 ring-background">+{peers.length - STACKED}</span>}
    </button>
    <div className="hidden items-center gap-1.5 md:flex" role="group" aria-label="People in this project">
      {visible.map(peer => {
        const name = peer.self ? 'You' : peer.user.name;
        const status = presenceLabel(peer, items);
        return <Tooltip key={peer.user.id}>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`${name}, ${status}`} aria-disabled={peer.self || undefined}
              className="flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:cursor-default"
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
      {rest.length > 0 && <button type="button" aria-label={`${rest.length} more ${rest.length === 1 ? 'person' : 'people'}, show everyone`} aria-haspopup="dialog" onClick={() => setOpen(true)}
        className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        +{rest.length}
      </button>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>People in this project</DialogTitle>
          <DialogDescription>{peers.length} {peers.length === 1 ? 'person' : 'people'} here now</DialogDescription>
        </DialogHeader>
        <ul className="-mx-2 flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
          {peers.map(peer => <li key={peer.user.id}>
            <button type="button" disabled={peer.self} onClick={() => { setOpen(false); onSelect(peer); }}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[0.8125rem] transition-colors hover:bg-muted disabled:hover:bg-transparent">
              <PeerAvatar peer={peer} size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{peer.self ? 'You' : peer.user.name} · {ROLE_LABELS[peer.role]}</span>
                <span className="truncate text-xs text-muted-foreground">{presenceLabel(peer, items)}</span>
              </span>
            </button>
          </li>)}
        </ul>
      </DialogContent>
    </Dialog>
  </>;
}

export function PeerDots({ peers }: { peers?: Peer[] }) {
  if (!peers?.length) return null;
  const names = peers.map(peer => peer.user.name).join(', ');
  return <span className="ml-auto flex shrink-0 items-center gap-0.5" title={names}>
    {peers.map(peer => <span key={peer.user.id} aria-hidden="true"
      className={`size-1.5 rounded-full ${peer.status === 'idle' ? 'opacity-50' : ''}`}
      style={{ backgroundColor: cursorColor(peer.user.id) }} />)}
    <span className="sr-only">{names} here</span>
  </span>;
}
