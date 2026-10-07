"use client"

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Copy } from 'lucide-react';
import type { Item, Trail } from '@/app/editor/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function SharedNoteIndicator({ item, trails, activeTrailId, onSelectItem, onCopy }: {
  item: Item;
  trails: Trail[];
  activeTrailId?: string;
  onSelectItem: (item: Item, trailId?: string) => void;
  onCopy: (trailId: string, itemId: string) => Promise<void>;
}) {
  const router = useRouter();
  const sharedTrails = [...trails.filter(trail => trail.itemIds.includes(item.id)), ...(item.otherTrails ?? [])];
  const current = sharedTrails.find(trail => trail.id === activeTrailId);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const copyingRef = useRef(false);
  if (sharedTrails.length < 2) return null;

  const copy = async () => {
    if (!current || copyingRef.current) return;
    copyingRef.current = true;
    setPending(true);
    setError('');
    try {
      await onCopy(current.id, item.id);
      setConfirming(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create a copy. Please try again.');
    } finally {
      copyingRef.current = false;
      setPending(false);
    }
  };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
          Used in {sharedTrails.length} trails <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto">
        <p className="px-2 py-2 text-xs text-muted-foreground">Changes to this note appear in all these trails.</p>
        {sharedTrails.map(trail => <DropdownMenuItem key={trail.id} disabled={pending}
          aria-current={trail.id === current?.id ? 'location' : undefined}
          className={trail.id === current?.id ? 'font-medium text-primary' : undefined}
          onSelect={() => {
            if ('projectId' in trail) router.push(`/editor/${trail.projectId}?note=${item.id}&trail=${trail.id}&write=1`);
            else onSelectItem(item, trail.id);
          }}>
          <span className="min-w-0 flex-1 break-words">{trail.title}</span>
          {trail.id === current?.id && <><span className="text-xs">Current</span><Check className="h-4 w-4" /></>}
        </DropdownMenuItem>)}
        {current && <DropdownMenuItem className="mt-2 border-t border-border whitespace-normal py-2" onSelect={() => {
          setError('');
          setConfirming(true);
        }}>
          <Copy className="h-4 w-4" /> Create an independent copy for this trail
        </DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog open={confirming} onOpenChange={setConfirming} destructive={false}
      title="Create an independent copy?"
      description="The copy will replace this note only in the current trail. The original will remain in the other trails. Future edits will be independent."
      confirmLabel={pending ? 'Saving and copying…' : 'Create copy'} pending={pending} error={error} onConfirm={() => { void copy(); }} />
  </>;
}
