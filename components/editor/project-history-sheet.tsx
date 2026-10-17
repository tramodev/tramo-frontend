"use client";

import { useRef, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LexicalReadOnly } from '@/components/project/lexical-read-only';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import { createProjectVersion, getProjectHistory, getProjectVersion, restoreProjectVersion, type ProjectHistory, type VersionDetail } from '@/lib/project-history';

export function ProjectHistorySheet({ projectId, restoreEpoch, beforeSave }: { projectId: string; restoreEpoch: number; beforeSave: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ProjectHistory | null>(null);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const selection = useRef(0);
  const action = useRef(false);

  const load = async (beforeId?: number) => {
    setLoading(true); setError('');
    try {
      const result = await getProjectHistory(projectId, beforeId);
      setHistory(previous => beforeId && previous ? { ...result, versions: [...previous.versions, ...result.versions] } : result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load history.'); }
    finally { setLoading(false); }
  };
  const preview = async (id: number) => {
    const request = ++selection.current;
    setPreviewLoading(true); setError(''); setDetail(null);
    try {
      const result = await getProjectVersion(projectId, id);
      if (request !== selection.current) return;
      setDetail(result); setSelectedItemId(result.snapshot.items[0]?.id ?? null);
    } catch (failure) { if (request === selection.current) setError(failure instanceof Error ? failure.message : 'Could not load version.'); }
    finally { if (request === selection.current) setPreviewLoading(false); }
  };
  const run = async (restore: boolean) => {
    if (action.current || (restore && !detail)) return;
    action.current = true; setBusy(true); setError('');
    try {
      await beforeSave();
      if (restore && detail) {
        await restoreProjectVersion(projectId, detail.version.id, restoreEpoch);
        window.location.reload();
      } else {
        await createProjectVersion(projectId, name, restoreEpoch);
        setName(''); await load();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save version.'); }
    finally { action.current = false; setBusy(false); }
  };
  const itemsById = new Map(detail?.snapshot.items.map(item => [item.id, item]));
  const selectedItem = selectedItemId == null ? undefined : itemsById.get(selectedItemId);
  const linkedIds = new Set(detail?.snapshot.trails.flatMap(trail => trail.itemIds));
  const unfiled = detail?.snapshot.items.filter(item => !linkedIds.has(item.id)) ?? [];

  return <>
    <Sheet open={open} onOpenChange={next => { if (action.current) return; setOpen(next); if (next) { setHistory(null); void load(); } else { ++selection.current; setDetail(null); setPreviewLoading(false); } }}>
      <SheetTrigger asChild><Button variant="ghost" size="icon" title="Project history" aria-label="Project history"><History className="h-[15px] w-[15px]" /></Button></SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-3xl">
        <SheetHeader><SheetTitle>Project history</SheetTitle><SheetDescription>Preview previous drafts or restore them. Published versions stay unchanged.</SheetDescription></SheetHeader>
        <div className="space-y-4 px-4 pb-4" aria-busy={busy}>
          {history?.unavailable && <p role="alert" className="text-sm text-destructive">Automatic history is unavailable because this project exceeds the snapshot limits. Your edits are still saved.</p>}
          <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void run(false); }}>
            <Input aria-label="Version name" placeholder="Version name (optional)" maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} />
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save version'}</Button>
          </form>
          {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" disabled={busy || loading} onClick={() => void load()}>Reload history</Button></div>}
          {loading && <p role="status" className="text-sm text-muted-foreground">Loading history…</p>}
          {!loading && history?.versions.length === 0 && <p className="text-sm text-muted-foreground">No versions yet. Save a named version or start editing.</p>}
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-1" aria-label="Versions">
              {history?.versions.map(version => <button type="button" key={version.id} disabled={busy} aria-pressed={detail?.version.id === version.id} className="w-full rounded-lg p-3 text-left text-sm hover:bg-accent aria-pressed:bg-accent disabled:opacity-50" onClick={() => void preview(version.id)}>
                <span className="block font-medium">{version.name || (version.type === 'RESTORE' ? 'Before restoration' : version.type === 'MANUAL' ? 'Manual version' : 'Automatic version')}</span>
                <span className="block text-xs text-muted-foreground">{version.type} · {new Date(version.createdAt).toLocaleString()}</span>
              </button>)}
              {history?.nextCursor && <Button variant="ghost" disabled={loading || busy} onClick={() => void load(history.nextCursor!)}>Load older versions</Button>}
            </div>
            <div className="min-w-0 space-y-3">
              {previewLoading && <p role="status">Loading preview…</p>}
              {detail && <>
                <h3 className="font-medium">{detail.snapshot.title}</h3>
                {detail.snapshot.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.snapshot.description}</p>}
                <Button disabled={busy} onClick={() => setConfirm(true)}>Restore this version</Button>
                <nav aria-label="Version notes" className="space-y-2">
                  {detail.snapshot.trails.map(trail => <div key={trail.id}><p className="text-sm font-medium">{trail.title}</p>{trail.description && <p className="text-xs text-muted-foreground">{trail.description}</p>}{trail.itemIds.map(id => <Button key={id} size="sm" variant={selectedItemId === id ? 'secondary' : 'ghost'} onClick={() => setSelectedItemId(id)}>{itemsById.get(id)?.title}</Button>)}</div>)}
                  {unfiled.length > 0 && <div><p className="text-sm font-medium">Notes without a trail</p>{unfiled.map(item => <Button key={item.id} size="sm" variant={selectedItemId === item.id ? 'secondary' : 'ghost'} onClick={() => setSelectedItemId(item.id)}>{item.title}</Button>)}</div>}
                </nav>
                {selectedItem && <EditorImagesProvider key={detail.version.id} projectId={projectId} versionId={detail.version.id}>
                  <article aria-label="Read-only version preview" className="rounded-lg border p-4"><h4 style={{ textAlign: selectedItem.titleAlign ?? 'center' }} className="mb-4 font-medium">{selectedItem.title}</h4><LexicalReadOnly key={`${detail.version.id}:${selectedItem.id}`} content={selectedItem.content ?? ''} onItemClick={id => { if (itemsById.has(Number(id))) setSelectedItemId(Number(id)); }} /></article>
                </EditorImagesProvider>}
              </>}
              {!detail && !previewLoading && <p className="text-sm text-muted-foreground">Select a version to preview it.</p>}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Restore this version?" description="Your current saved project will be kept as a safety version before restoring. This replaces the draft, including its notes and trail order." confirmLabel="Restore version" destructive={false} onConfirm={() => void run(true)} />
  </>;
}
