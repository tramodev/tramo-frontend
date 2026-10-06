// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { R2_PRIVATE_ORIGIN } from '@/lib/config';

type Image = { imageId: string; url: string; expiresAt: string };
type Context = { projectId: string; publicRead?: boolean; snapshotId?: number };

class ImageStore {
  private listeners = new Map<string, Set<() => void>>();
  private images = new Map<string, Image>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | undefined;
  private generation = 0;
  constructor(private context: Context) {}

  subscribe = (id: string, listener: () => void) => {
    const listeners = this.listeners.get(id) ?? new Set();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    this.schedule();
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(id);
    };
  };

  get = (id: string) => this.images.get(id)?.url ?? '';

  schedule = () => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.load(); }, 0);
  };

  private async load() {
    if (document.visibilityState === 'hidden') return;
    const ids = [...this.listeners.keys()];
    const generation = ++this.generation;
    this.request?.abort();
    this.request = new AbortController();
    for (let start = 0; start < ids.length; start += 100) {
      const batch = ids.slice(start, start + 100);
      try {
        const response = await fetch('/api/editor-images/resolve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
          body: JSON.stringify({ ...this.context, imageIds: batch }), signal: this.request.signal,
        });
        if (!response.ok) throw new Error('Image is unavailable');
        const data: { images: Image[] } = await response.json();
        if (generation !== this.generation) return;
        batch.forEach(id => this.images.delete(id));
        for (const image of data.images) {
          const url = new URL(image.url);
          if (R2_PRIVATE_ORIGIN && url.origin === R2_PRIVATE_ORIGIN && Date.parse(image.expiresAt) > Date.now()) {
            this.images.set(image.imageId, image);
          }
        }
      } catch {
        if (generation !== this.generation) return;
        batch.forEach(id => this.images.delete(id));
      }
      batch.forEach(id => this.listeners.get(id)?.forEach(listener => listener()));
    }
  }

  stop = () => {
    ++this.generation;
    this.request?.abort();
    if (this.timer) clearTimeout(this.timer);
    this.images.clear();
  };
}

const ImagesContext = createContext<ImageStore | null>(null);

export function EditorImagesProvider({ projectId, publicRead = false, snapshotId, children }: Context & { children: ReactNode }) {
  const store = useMemo(() => new ImageStore({ projectId, publicRead, snapshotId }), [projectId, publicRead, snapshotId]);
  useEffect(() => {
    const interval = setInterval(store.schedule, 240000);
    document.addEventListener('visibilitychange', store.schedule);
    window.addEventListener('editor-images-saved', store.schedule);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', store.schedule);
      window.removeEventListener('editor-images-saved', store.schedule);
      store.stop();
    };
  }, [store]);
  return <ImagesContext.Provider value={store}>{children}</ImagesContext.Provider>;
}

export function useEditorImage(imageId: string): string {
  const store = useContext(ImagesContext);
  const subscribe = useMemo(() => (listener: () => void) => imageId && store ? store.subscribe(imageId, listener) : () => {}, [store, imageId]);
  return useSyncExternalStore(subscribe, () => store?.get(imageId) ?? '', () => '');
}
