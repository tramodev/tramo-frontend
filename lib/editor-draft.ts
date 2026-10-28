import type { TitleAlign } from '@/app/editor/types';
import { commitEditorDraft, DraftRequestError } from '@/lib/editor-draft-client';
import { acceptExtractionEpoch, getItemContent, saveItemContent } from '@/lib/item-content-client';
import { saveDraftMetadata } from '@/lib/projects-store';
import { validateEmbed } from '@/app/editor/plugins/embed';
import { collectPlainText } from '@/app/editor/editor-utils';

export interface DraftEntities {
  project: { title: string };
  trail: { title: string };
  item: { title: string; titleAlign: TitleAlign; content: string };
}

export interface DraftCommitResult {
  projectId: string;
  trailId: number;
  itemId: number;
  restoreEpoch: number;
  projectTitle: string;
  trailTitle: string;
  itemTitle: string;
}

export interface DraftBackup {
  version: 1;
  userId: string;
  clientRequestId: string;
  updatedAt: number;
  latest: DraftEntities;
  submitted?: DraftEntities;
  result?: DraftCommitResult;
  synced?: DraftEntities;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const draftStorageKey = (userId: string, id: string) => `tramo:draft:${userId}:${id}`;
const sessionKey = (userId: string) => `tramo:active-draft:${userId}`;

export function beginDraft(userId: string) {
  try { sessionStorage.removeItem(sessionKey(userId)); } catch {}
}

function meaningfulNode(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const node = value as Record<string, unknown>;
  if (node.type === 'paragraph' && Array.isArray(node.children) && node.children.every(child => child?.type === 'text')
    && node.children.map(child => child.text).join('').trim() === '/') return false;
  if (typeof node.text === 'string' && hasVisibleText(node.text)) return true;
  if (node.type === 'equation' && typeof node.equation === 'string' && node.equation.trim()) return true;
  if (node.type === 'music' && typeof node.abc === 'string' && node.abc.trim()) return true;
  if (node.type === 'embed' && validateEmbed(node.provider, node.id)) return true;
  if (node.type === 'image' && typeof node.imageId === 'string' && node.imageId) return true;
  return Array.isArray(node.children) && node.children.some(meaningfulNode);
}

export function hasDraftContent(value: DraftEntities): boolean {
  if ([value.project.title, value.trail.title, value.item.title].some(hasVisibleText)) return true;
  try { return meaningfulNode(JSON.parse(value.item.content).root); } catch { return false; }
}

function hasVisibleText(value: string): boolean {
  return !!value.replace(/\p{Default_Ignorable_Code_Point}/gu, '').trim();
}

export function clearLocalDrafts(userId?: string | null) {
  try {
    localStorage.setItem('tramo:draft-owner', userId ?? '');
    for (const [storage, prefix] of [[localStorage, 'tramo:draft:'], [localStorage, 'tramo:item-title:'], [localStorage, 'tramo:item-content:'], [sessionStorage, 'tramo:item-content:'], [sessionStorage, 'tramo:active-draft:']] as const) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith(prefix) && (!userId || !key.startsWith(`${prefix}${userId}:`) && key !== `${prefix}${userId}`)) storage.removeItem(key);
      }
    }
  } catch {}
}

export function draftLabel(draft: DraftBackup): string {
  const latest = draft.latest;
  const title = latest.project.title || latest.item.title || latest.trail.title;
  if (title) return title;
  try { return collectPlainText(latest.item.content).join(' ').trim().slice(0, 120) || 'Untitled draft'; }
  catch { return 'Untitled draft'; }
}

function validEntities(value: unknown): value is DraftEntities {
  if (!value || typeof value !== 'object') return false;
  const entity = value as DraftEntities;
  return typeof entity.project?.title === 'string' && entity.project.title.length <= 255
    && typeof entity.trail?.title === 'string' && entity.trail.title.length <= 255
    && typeof entity.item?.title === 'string' && entity.item.title.length <= 255
    && ['left', 'center', 'right'].includes(entity.item.titleAlign)
    && typeof entity.item.content === 'string'
    && validContent(entity.item.content);
}

function validContent(content: string): boolean {
  if (!content) return true;
  try {
    const root = JSON.parse(content)?.root;
    return root?.type === 'root' && Array.isArray(root.children);
  } catch { return false; }
}

export function readDraft(userId: string, id: string): DraftBackup | null {
  if (!uuidPattern.test(id)) return null;
  try {
    const key = draftStorageKey(userId, id);
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as DraftBackup | null;
    if (!value) return null;
    const result = value.result;
    const validResult = !result || (typeof result.projectId === 'string' && /^[a-zA-Z0-9]+$/.test(result.projectId)
      && Number.isSafeInteger(result.itemId) && result.itemId > 0 && Number.isSafeInteger(result.trailId) && result.trailId > 0
      && Number.isSafeInteger(result.restoreEpoch) && result.restoreEpoch >= 0
      && [result.projectTitle, result.trailTitle, result.itemTitle].every(title => typeof title === 'string'));
    if (value.version !== 1 || value.userId !== userId || value.clientRequestId !== id
      || !Number.isFinite(value.updatedAt) || value.updatedAt < Date.now() - WEEK
      || !validEntities(value.latest) || (value.submitted && !validEntities(value.submitted))
      || (value.synced && !validEntities(value.synced)) || !validResult
      || (result && !value.submitted) || !hasDraftContent(value.latest)) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch { return null; }
}

export function listDrafts(userId: string): DraftBackup[] {
  const prefix = `tramo:draft:${userId}:`;
  try {
    return Object.keys(localStorage).filter(key => key.startsWith(prefix))
      .map(key => readDraft(userId, key.slice(prefix.length)))
      .filter((draft): draft is DraftBackup => !!draft && hasDraftContent(draft.latest))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

export function discardDraft(userId: string, id: string) {
  localStorage.removeItem(draftStorageKey(userId, id));
  if (sessionStorage.getItem(sessionKey(userId)) === id) sessionStorage.removeItem(sessionKey(userId));
}

export function recoverDraft(userId: string, id: string) {
  if (!readDraft(userId, id)) throw new Error('This local draft is no longer available.');
  sessionStorage.setItem(sessionKey(userId), id);
}

export function newDraft(userId: string, fresh = false): EditorDraft {
  listDrafts(userId);
  let id: string | null = null;
  try { id = fresh ? null : sessionStorage.getItem(sessionKey(userId)); } catch {}
  const backup = id ? readDraft(userId, id) : null;
  if (backup) return new EditorDraft(backup);
  id = crypto.randomUUID();
  try { sessionStorage.setItem(sessionKey(userId), id); } catch {}
  return new EditorDraft({ version: 1, userId, clientRequestId: id, updatedAt: Date.now(), latest: {
    project: { title: '' }, trail: { title: '' }, item: { title: '', titleAlign: 'left', content: '' },
  } });
}

export function editorDraftForRoute(userId: string, projectId: string): EditorDraft | null {
  if (projectId === 'new') return newDraft(userId);
  try {
    const id = sessionStorage.getItem(sessionKey(userId));
    const backup = id ? readDraft(userId, id) : null;
    return backup?.result?.projectId === projectId ? new EditorDraft(backup) : null;
  } catch { return null; }
}

export class EditorDraft {
  readonly editorKey: string;
  onCreated?: (result: DraftCommitResult) => void;
  private listeners = new Set<() => void>();
  private snapshot: { status: 'draft' | 'committing' | 'syncing' | 'saved' | 'error'; error: string } = { status: 'draft', error: '' };
  private inFlight: Promise<string> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private titleTimer: ReturnType<typeof setTimeout> | null = null;
  private titleReady: Promise<void> | null = null;
  private finishTitle?: () => void;
  private attempt = 0;
  private disposed = false;
  private storageError = '';
  private pendingFiles = 0;
  private pendingImages = false;
  private pendingCommand = false;
  private created = false;
  private confirmed = false;
  private retryable = false;
  private claimPromise?: Promise<void>;
  private release?: () => void;
  constructor(readonly backup: DraftBackup) { this.editorKey = `draft-${backup.clientRequestId}`; }
  claim(): Promise<void> {
    return this.claimPromise ??= this.acquire();
  }
  private async acquire(): Promise<void> {
    if (!globalThis.navigator?.locks) return;
    await new Promise<void>((resolve, reject) => {
      void navigator.locks.request(draftStorageKey(this.backup.userId, this.backup.clientRequestId), { ifAvailable: true }, async lock => {
        if (this.disposed && !this.inFlight) { resolve(); return; }
        if (!lock) {
          this.fork();
          await this.acquire();
          resolve();
          return;
        }
        await new Promise<void>(release => { this.release = release; resolve(); });
      }).catch(reject);
    });
  }
  private fork() {
    this.backup.clientRequestId = crypto.randomUUID();
    this.backup.submitted = undefined;
    this.backup.result = undefined;
    this.backup.synced = undefined;
    this.confirmed = false;
    this.created = false;
    try { sessionStorage.setItem(sessionKey(this.backup.userId), this.backup.clientRequestId); } catch {}
    this.persist();
  }
  setOnCreated(callback?: (result: DraftCommitResult) => void) { this.onCreated = callback; if (callback) this.disposed = false; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private emit(status: typeof this.snapshot.status, error = '') {
    this.snapshot = { status, error: [error, this.storageError].filter(Boolean).join(' ') };
    this.listeners.forEach(listener => listener());
  }
  private persist() {
    this.backup.updatedAt = Date.now();
    try {
      const owner = localStorage.getItem('tramo:draft-owner');
      if (owner !== null && owner !== this.backup.userId) return;
      localStorage.setItem(draftStorageKey(this.backup.userId, this.backup.clientRequestId), JSON.stringify(this.backup));
      this.storageError = '';
    } catch { this.storageError = 'Local backup is unavailable. Keep this tab open until your changes are saved.'; }
  }
  update(change: Partial<DraftEntities>, debounceTitle = false, pendingCommand = false) {
    this.pendingCommand = pendingCommand;
    Object.assign(this.backup.latest, copy(change));
    if (this.snapshot.status === 'saved') return;
    if (debounceTitle) {
      if (this.titleTimer) clearTimeout(this.titleTimer);
      this.titleReady ??= new Promise(resolve => { this.finishTitle = resolve; });
      this.titleTimer = setTimeout(() => {
        this.titleTimer = null;
        this.titleReady = null;
        this.finishTitle?.();
        this.finishTitle = undefined;
        if (!this.pendingCommand && !this.timer && (this.snapshot.status !== 'error' || !this.backup.submitted)
          && (hasDraftContent(this.backup.latest) || this.backup.submitted)) void this.commit().catch(() => {});
      }, 600);
    }
    if (hasDraftContent(this.backup.latest) || this.backup.submitted) {
      this.persist();
      if (!this.pendingCommand && !this.timer && !this.titleTimer && (this.snapshot.status !== 'error' || !this.backup.submitted)) void this.commit().catch(() => {});
    } else { try { localStorage.removeItem(draftStorageKey(this.backup.userId, this.backup.clientRequestId)); } catch {} }
  }
  start() {
    this.disposed = false;
    try { sessionStorage.setItem(sessionKey(this.backup.userId), this.backup.clientRequestId); } catch {}
    if (this.backup.submitted || hasDraftContent(this.backup.latest)) void this.commit().catch(() => {});
  }
  retry = () => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.attempt = 0;
    void this.commit().catch(() => {});
  };
  dispose() {
    this.disposed = true;
    if (!this.inFlight) { this.release?.(); this.release = undefined; }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.titleTimer) clearTimeout(this.titleTimer);
    this.titleTimer = null;
    this.titleReady = null;
    this.finishTitle?.();
    this.finishTitle = undefined;
  }
  setPendingImages(pending: boolean) { this.pendingImages = pending; }
  needsUnloadWarning = () => this.pendingImages || this.pendingFiles > 0 || (this.snapshot.status !== 'saved' && !!this.storageError);
  resolveProjectId = async (): Promise<string | undefined> => {
    if (!this.backup.submitted && !hasDraftContent(this.backup.latest)) return undefined;
    this.pendingFiles++;
    try {
      return await new Promise<string>((resolve, reject) => {
        const finish = () => {
          if (this.snapshot.status === 'saved' && this.backup.result) {
            unsubscribe(); resolve(this.backup.result.projectId);
          } else if (this.snapshot.status === 'error' && !this.retryable) {
            unsubscribe(); reject(new Error(this.snapshot.error));
          }
        };
        const unsubscribe = this.subscribe(finish);
        void this.commit().then(() => finish()).catch(error => {
          if (!this.retryable) { unsubscribe(); reject(error); }
        });
      });
    } finally { this.pendingFiles--; }
  };
  commit(): Promise<string> {
    if (this.snapshot.status === 'saved' && this.backup.result) return Promise.resolve(this.backup.result.projectId);
    if (this.inFlight) return this.inFlight;
    if (!this.backup.submitted && !hasDraftContent(this.backup.latest)) return Promise.reject(new Error('Write something first.'));
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.inFlight = this.save().finally(() => {
      this.inFlight = null;
      if (this.disposed) { this.release?.(); this.release = undefined; }
    });
    return this.inFlight;
  }
  private async metadata(entity: 'project' | 'trail' | 'item', id: string, fields: { title?: string; titleAlign?: TitleAlign }) {
    const result = this.backup.result!;
    const response = await saveDraftMetadata(result.projectId, entity, id, fields, result.restoreEpoch);
    if (response.status >= 400) throw new DraftRequestError(response.message ?? 'Could not save draft metadata.', response.status, response.retryAfter, response.code);
  }
  private async save(): Promise<string> {
    try {
      if (this.titleReady) await this.titleReady;
      if (!this.backup.submitted) this.backup.submitted = copy(this.backup.latest);
      this.persist();
      if (!this.confirmed || !this.backup.result) {
        this.emit('committing');
        try {
          this.backup.result = await commitEditorDraft(this.backup.clientRequestId, this.backup.submitted);
        } catch (error) {
          if (!(error instanceof DraftRequestError) || error.status !== 404) throw error;
          const previousId = this.backup.clientRequestId;
          this.fork();
          this.release?.();
          this.release = undefined;
          await this.acquire();
          this.backup.submitted = copy(this.backup.latest);
          this.persist();
          if (!this.storageError) localStorage.removeItem(draftStorageKey(this.backup.userId, previousId));
          this.backup.result = await commitEditorDraft(this.backup.clientRequestId, this.backup.submitted);
        }
        this.confirmed = true;
        this.persist();
      }
      const result = this.backup.result;
      if (!this.created && !this.disposed) { this.created = true; this.onCreated?.(result); }
      this.emit('syncing');
      const base = this.backup.synced ?? copy(this.backup.submitted);
      this.backup.synced = base;
      acceptExtractionEpoch(String(result.itemId), 0, base.item.content);
      while (true) {
        if (this.titleReady) await this.titleReady;
        const latest = copy(this.backup.latest);
        const epoch = result.restoreEpoch;
        if (base.project.title !== latest.project.title) {
          await this.metadata('project', result.projectId, { title: latest.project.title.trim() || 'Untitled project' });
          base.project = copy(latest.project); this.persist();
        }
        if (base.trail.title !== latest.trail.title) {
          await this.metadata('trail', String(result.trailId), { title: latest.trail.title.trim() || 'My first trail' });
          base.trail = copy(latest.trail); this.persist();
        }
        if (base.item.title !== latest.item.title) {
          await this.metadata('item', String(result.itemId), { title: latest.item.title.trim() || 'Untitled note' });
          base.item.title = latest.item.title; this.persist();
        }
        if (base.item.titleAlign !== latest.item.titleAlign) {
          await this.metadata('item', String(result.itemId), { titleAlign: latest.item.titleAlign });
          base.item.titleAlign = latest.item.titleAlign; this.persist();
        }
        if (base.item.content !== latest.item.content) {
          try { await saveItemContent(String(result.itemId), latest.item.content, epoch, result.projectId); }
          catch (error) {
            if (!(error instanceof Error) || error.name !== 'ContentConflict' || await getItemContent(String(result.itemId)) !== latest.item.content) throw error;
            acceptExtractionEpoch(String(result.itemId), 0, latest.item.content);
          }
          base.item.content = latest.item.content; this.persist();
        }
        if (!this.titleReady && JSON.stringify(latest) === JSON.stringify(this.backup.latest)) break;
      }
      try { discardDraft(this.backup.userId, this.backup.clientRequestId); } catch {}
      this.storageError = '';
      this.emit('saved');
      return result.projectId;
    } catch (error) {
      const transient = error instanceof DraftRequestError ? error.retryable
        : error instanceof TypeError || (error instanceof Error && /(?:status (?:408|429|5\d\d)|Failed to fetch|NetworkError)/.test(error.message));
      this.retryable = transient;
      if (error instanceof DraftRequestError && [400, 413].includes(error.status) && !this.backup.result) {
        this.backup.submitted = undefined;
        this.persist();
      }
      this.emit('error', error instanceof Error ? error.message : 'Could not save your draft.');
      if (transient && !this.disposed) {
        const wait = error instanceof DraftRequestError && error.retryAfter ? error.retryAfter : Math.min(1000 * 2 ** this.attempt++, 30000);
        this.timer = setTimeout(() => { this.timer = null; void this.commit().catch(() => {}); }, wait);
      }
      throw error;
    }
  }
}
