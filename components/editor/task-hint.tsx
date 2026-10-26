// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useSyncExternalStore, type ReactNode } from 'react';
import { X } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('storage', callback);
  };
}

export function TaskHint({ id, children }: { id: string; children: ReactNode }) {
  const key = `tramo:hint:${id}`;
  const visible = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key) !== 'dismissed'; } catch { return false; } }, () => false);
  if (!visible) return null;
  return <div className="editor-task-hint flex items-start gap-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
    <div className="flex-1">{children}</div>
    <button type="button" aria-label="Dismiss tip" onClick={() => {
      try { localStorage.setItem(key, 'dismissed'); } catch { return; }
      window.dispatchEvent(new Event('storage'));
    }} className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-background"><X className="h-3 w-3" /></button>
  </div>;
}
