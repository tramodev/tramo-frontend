"use client";

import { useRef, useState } from 'react';
import { ExternalLink, History } from 'lucide-react';
import Link from 'next/link';
import { Tabs } from 'radix-ui';
import { Row } from '@/components/profile/row';
import { getProjectSnapshots, type ProjectSnapshotSummary } from '@/lib/project-snapshots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { createProjectVersion, getProjectHistory, type ProjectHistory } from '@/lib/project-history';

export function ProjectHistorySheet({ projectId, restoreEpoch, beforeSave }: { projectId: string; restoreEpoch: number; beforeSave: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('project');
  const [publications, setPublications] = useState<ProjectSnapshotSummary[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [publicationsError, setPublicationsError] = useState('');
  const [history, setHistory] = useState<ProjectHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const paginationFocus = useRef<number | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const action = useRef(false);

  const closeSnapshotForm = () => {
    setCreating(false); setName('');
    requestAnimationFrame(() => createButton.current?.focus());
  };

  const load = async (beforeId?: number) => {
    setLoading(true); setError('');
    try {
      const result = await getProjectHistory(projectId, beforeId);
      paginationFocus.current = beforeId != null ? history?.versions.length ?? 0 : null;
      setHistory(previous => beforeId && previous ? { ...result, versions: [...previous.versions, ...result.versions] } : result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load history.'); }
    finally { setLoading(false); }
  };
  const loadPublications = async () => {
    setPublicationsLoading(true); setPublicationsError(''); setPublications([]);
    try { setPublications(await getProjectSnapshots(projectId)); }
    catch (failure) { setPublicationsError(failure instanceof Error ? failure.message : 'Could not load publish history.'); }
    finally { setPublicationsLoading(false); }
  };
  const saveVersion = async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    try {
      await beforeSave();
      await createProjectVersion(projectId, name, restoreEpoch);
      closeSnapshotForm(); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not create snapshot.'); }
    finally { action.current = false; setBusy(false); }
  };

  return <>
    <Sheet open={open} onOpenChange={next => { if (action.current) return; setOpen(next); if (next) { setCreating(false); setName(''); setTab('project'); setHistory(null); setCompareIds([]); void load(); } }}>
      <SheetTrigger asChild><Button variant="ghost" size="icon" title="Version history" aria-label="Version history"><History className="h-[15px] w-[15px]" /></Button></SheetTrigger>
      <SheetContent className="top-28 h-[calc(100%-7rem)] md:top-16 md:h-[calc(100%-4rem)] overflow-y-auto sm:max-w-lg 2xl:max-w-[37.5rem]">
        <SheetHeader className="pr-12"><SheetTitle>Version history</SheetTitle><SheetDescription>Browse project drafts and published versions.</SheetDescription></SheetHeader>
        <Tabs.Root value={tab} onValueChange={value => { setTab(value); if (value === 'publish') return loadPublications(); }} className="space-y-4 px-4 pb-4">
          <Tabs.List aria-label="History type" className="inline-flex gap-1 rounded-full bg-muted p-1">
            <Tabs.Trigger value="project" disabled={busy} asChild><Button variant="ghost" size="sm" className="data-[state=active]:bg-background data-[state=active]:shadow-elevation-1">Project history</Button></Tabs.Trigger>
            <Tabs.Trigger value="publish" disabled={busy} asChild><Button variant="ghost" size="sm" className="data-[state=active]:bg-background data-[state=active]:shadow-elevation-1">Publish history</Button></Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="project" className="space-y-4" aria-busy={busy}>
            <p className="text-sm text-muted-foreground">Your edits are autosaved. Create a snapshot to keep a version of your project as it is now, so you can return to it later.</p>
            {history?.unavailable && <p role="alert" className="text-sm text-destructive">Automatic history is unavailable because this project exceeds the snapshot limits. Your edits are still saved.</p>}
            {creating ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void saveVersion(); }}>
              <Input autoFocus className="h-9" aria-label="Snapshot name" placeholder="Snapshot name (optional)" maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" disabled={busy} onClick={closeSnapshotForm}>Cancel</Button>
                <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
              </div>
            </form> : <Button ref={createButton} variant="outline" onClick={() => setCreating(true)}>Create snapshot</Button>}
            {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" disabled={busy || loading} onClick={() => void load()}>Reload history</Button></div>}
            {loading && <p role="status" className="text-sm text-muted-foreground">Loading history…</p>}
            {!loading && history?.versions.length === 0 && <p className="text-sm text-muted-foreground">No versions yet. Create a snapshot or start editing.</p>}
            {compareIds.length === 2 && <Button asChild variant="outline"><Link href={`/projects/${projectId}/history/${Math.min(...compareIds)}?compare=${Math.max(...compareIds)}`} target="_blank" rel="noopener noreferrer">Compare selected versions (new tab)</Link></Button>}
            <p className="text-xs text-muted-foreground">Select two versions to compare their changes.</p>
            <div className="flex flex-col gap-1 [&>div]:rounded-none" role="group" aria-label="Versions">
              {history?.versions.map((version, index) => <Row key={version.id}>
                <input type="checkbox" className="accent-primary" aria-label={`Compare ${version.name || version.type.toLowerCase() + ' version'} from ${new Date(version.createdAt).toLocaleString()}`} checked={compareIds.includes(version.id)} disabled={compareIds.length === 2 && !compareIds.includes(version.id)} onChange={event => setCompareIds(ids => event.target.checked ? [...ids, version.id] : ids.filter(id => id !== version.id))} />
                <Link ref={element => { if (element && !loading && paginationFocus.current === index) { paginationFocus.current = null; element.focus(); } }} href={`/projects/${projectId}/history/${version.id}`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary" aria-label={`Preview ${version.name || version.type.toLowerCase() + ' version'} from ${new Date(version.createdAt).toLocaleString()} by ${version.authorUsername} in a new tab`}>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{version.name || (version.type === 'RESTORE' ? 'Before restoration' : version.type === 'MANUAL' ? 'Manual version' : 'Automatic version')}</span>
                    <span className="block text-xs text-muted-foreground">{version.type} · {new Date(version.createdAt).toLocaleString()} · @{version.authorUsername}</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
              </Row>)}
              {history?.nextCursor && <Button variant="ghost" aria-disabled={loading || busy} onClick={() => { if (!loading && !busy) void load(history.nextCursor!); }}>Load older versions</Button>}
            </div>
          </Tabs.Content>
          <Tabs.Content value="publish" className="flex flex-col gap-1 [&>div]:rounded-none" aria-busy={publicationsLoading}>
            <p className="mb-3 text-sm text-muted-foreground">Every time you publish, a new version is saved here.</p>
            {publicationsLoading && <p role="status" className="text-sm text-muted-foreground">Loading publish history…</p>}
            {publicationsError && <div role="alert" className="text-sm text-destructive">{publicationsError}<Button variant="ghost" onClick={() => void loadPublications()}>Retry</Button></div>}
            {!publicationsLoading && !publicationsError && publications.length === 0 && <p className="text-sm text-muted-foreground">No published versions yet.</p>}
            {publications.map(version => <Row key={version.id}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">Version {version.version}</span>
                <span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</span>
              </div>
              <Link href={`/p/${projectId}/versions/${version.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open version ${version.version} in a new tab`} className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Open link <ExternalLink className="h-3 w-3" />
              </Link>
            </Row>)}
          </Tabs.Content>
        </Tabs.Root>
      </SheetContent>
    </Sheet>
  </>;
}
