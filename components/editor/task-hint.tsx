"use client"

import { useSyncExternalStore, type ReactNode } from 'react';
import { X } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('focusin', callback);
  window.addEventListener('focusout', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('focusin', callback);
    window.removeEventListener('focusout', callback);
  };
}

export function TaskHint({ id, children }: { id: string; children: ReactNode }) {
  const key = `tramo:hint:${id}`;
  const visible = useSyncExternalStore(subscribe, () => localStorage.getItem(key) !== 'dismissed', () => false);
  const writing = useSyncExternalStore(subscribe, () => !!document.activeElement?.closest('[contenteditable="true"], input, textarea'), () => false);
  if (!visible) return null;
  return <div className="flex items-start gap-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground" style={{ visibility: writing ? 'hidden' : undefined }}>
    <div className="flex-1">{children}</div>
    <button type="button" aria-label="Dismiss tip" onClick={() => {
      localStorage.setItem(key, 'dismissed');
      window.dispatchEvent(new Event('storage'));
    }} className="shrink-0 rounded p-1 hover:bg-background"><X className="h-3 w-3" /></button>
  </div>;
}
