import { DraftRequestError } from '@/lib/editor-draft-client';
import { saveDraftMetadata } from '@/lib/projects-store';

interface PendingTitle {
  projectId: string;
  itemId: string;
  title: string;
  restoreEpoch: number;
}

const prefix = (userId: string) => `tramo:item-title:${userId}:`;

export function hasPendingItemTitles(userId: string): boolean {
  return Object.keys(localStorage).some(key => key.startsWith(prefix(userId)));
}

export class ItemTitleSaves {
  private pending = new Map<string, PendingTitle>();
  private listeners = new Set<() => void>();
  private snapshot: { status: 'idle' | 'saving' | 'saved' | 'error'; error: string } = { status: 'idle', error: '' };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private retryAt = 0;
  private attempt = 0;
  private stopped = false;
  private permanent = false;
  private error = '';
  private storageError = '';

  constructor(private userId?: string) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private key(value: PendingTitle) { return `${prefix(this.userId ?? '')}${value.projectId}:${value.itemId}`; }
  private emit() {
    const error = [this.error, this.storageError].filter(Boolean).join(' ');
    this.snapshot = { status: error ? 'error' : this.pending.size ? 'saving' : 'saved', error };
    this.listeners.forEach(listener => listener());
  }
  private schedule(delay = 600) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.stopped || this.permanent || !this.pending.size) return;
    this.timer = setTimeout(() => { this.timer = null; void this.save().catch(() => {}); }, Math.max(delay, this.retryAt - Date.now()));
  }
  update(projectId: string, itemId: string, title: string, restoreEpoch: number) {
    const value = { projectId, itemId, title, restoreEpoch };
    const key = this.key(value);
    this.pending.set(key, value);
    this.permanent = false;
    try {
      if (this.userId) {
        const owner = localStorage.getItem('tramo:draft-owner');
        if (owner === null || owner === this.userId) localStorage.setItem(key, JSON.stringify(value));
      }
      this.storageError = '';
    } catch { this.storageError = 'Local title backup is unavailable. Keep this tab open until your changes are saved.'; }
    this.schedule();
    this.emit();
  }
  restore(projectId: string, itemIds: string[]): Record<string, string> {
    const titles: Record<string, string> = {};
    if (!this.userId) return titles;
    try {
      for (const itemId of itemIds) {
        const key = `${prefix(this.userId)}${projectId}:${itemId}`;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let value: PendingTitle;
        try { value = JSON.parse(raw); } catch { localStorage.removeItem(key); continue; }
        if (!value || value.projectId !== projectId || value.itemId !== itemId || typeof value.title !== 'string'
          || value.title.length > 255 || !Number.isSafeInteger(value.restoreEpoch) || value.restoreEpoch < 0) {
          localStorage.removeItem(key);
          continue;
        }
        titles[itemId] = value.title;
        this.update(projectId, itemId, value.title, value.restoreEpoch);
      }
    } catch { this.storageError = 'Could not restore local title backups.'; this.emit(); }
    return titles;
  }
  start() { this.stopped = false; this.schedule(); }
  dispose() { this.stopped = true; if (this.timer) clearTimeout(this.timer); this.timer = null; }
  needsUnloadWarning = () => !!this.storageError && this.pending.size > 0;
  retry = () => { this.permanent = false; this.schedule(0); };
  discard(projectId: string, itemId: string) {
    const key = this.key({ projectId, itemId, title: '', restoreEpoch: 0 });
    this.pending.delete(key);
    try { if (this.userId) localStorage.removeItem(key); } catch {}
    if (!this.pending.size) { this.error = ''; this.storageError = ''; }
    this.emit();
  }
  async flush() {
    while (this.pending.size) {
      if (this.retryAt > Date.now() || this.permanent) throw new Error(this.error || 'The note title has not been saved yet.');
      await this.save();
    }
  }
  private save(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const first = this.pending.entries().next().value;
    if (!first) return Promise.resolve();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const [key, value] = first;
    try {
      const owner = this.userId ? localStorage.getItem('tramo:draft-owner') : null;
      if (owner !== null && owner !== this.userId) { this.pending.clear(); this.emit(); return Promise.resolve(); }
    } catch {}
    this.inFlight = (async () => {
      try {
        const response = await saveDraftMetadata(value.projectId, 'item', value.itemId,
          { title: value.title.trim() || 'Untitled note' }, value.restoreEpoch);
        if (response.status >= 400) throw new DraftRequestError(response.message ?? 'Could not save the note title.', response.status, response.retryAfter, response.code);
        if (this.pending.get(key) === value) this.pending.delete(key);
        try {
          if (this.userId && localStorage.getItem(key) === JSON.stringify(value)) localStorage.removeItem(key);
        } catch {}
        this.error = '';
        this.retryAt = 0;
        this.attempt = 0;
        if (!this.pending.size) this.storageError = '';
      } catch (error) {
        if (!this.pending.has(key)) return;
        this.permanent = error instanceof DraftRequestError && !error.retryable;
        const retryAfter = error instanceof DraftRequestError && Number.isFinite(error.retryAfter) ? error.retryAfter : 0;
        this.retryAt = Date.now() + Math.max(retryAfter, Math.min(1000 * 2 ** this.attempt++, 30000));
        this.error = 'Could not save the note title. Your latest title is kept locally.';
        throw error;
      } finally {
        this.inFlight = null;
        this.emit();
        this.schedule();
      }
    })();
    return this.inFlight;
  }
}
