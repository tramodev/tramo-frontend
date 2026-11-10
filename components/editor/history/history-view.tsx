"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import { LexicalReadOnly } from '@/components/project/lexical-read-only';
import { RestoreProjectVersionButton } from '@/components/project/restore-project-version-button';
import { useMounted } from '@/hooks/use-mounted';
import { cursorColor } from '@/lib/collab-client';
import { diffNoteContent } from '@/lib/lexical-diff';
import { compareVersionEntries } from '@/lib/version-comparison';
import { createProjectVersion, getProjectHistory, getProjectVersion, type HistoryVersion, type ProjectHistory, type VersionSnapshot } from '@/lib/project-history';

type Selection = number | 'current';

function noteOrder(snapshot: VersionSnapshot) {
  const linked = new Set(snapshot.trails.flatMap(trail => trail.itemIds));
  return [
    ...snapshot.trails.map(trail => ({ title: trail.title, itemIds: trail.itemIds })),
    { title: 'Notes', itemIds: snapshot.items.filter(item => !linked.has(item.id)).map(item => item.id) },
  ].filter(group => group.itemIds.length);
}

function versionLabel(version: HistoryVersion) {
  return version.name || (version.type === 'RESTORE' ? 'Before restoration' : null);
}

export function HistoryView({ projectId, restoreEpoch, initialHistory, current, latest }: {
  projectId: string;
  restoreEpoch: number;
  initialHistory: ProjectHistory;
  current: VersionSnapshot;
  latest: VersionSnapshot | null;
}) {
  const mounted = useMounted();
  const [history, setHistory] = useState(initialHistory);
  const [snapshots, setSnapshots] = useState<Map<Selection, VersionSnapshot>>(() => new Map<Selection, VersionSnapshot>(latest && initialHistory.versions[0] ? [['current', current], [initialHistory.versions[0].id, latest]] : [['current', current]]));
  const [selected, setSelected] = useState<Selection>('current');
  const [noteId, setNoteId] = useState<number | null>(() => noteOrder(current)[0]?.itemIds[0] ?? null);
  const [showChanges, setShowChanges] = useState(true);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const entries: Selection[] = ['current', ...history.versions.map(version => version.id)];
  const baseOf = (selection: Selection) => entries[entries.indexOf(selection) + 1];
  const snapshot = snapshots.get(selected);
  const base = snapshots.get(baseOf(selected));
  const version = history.versions.find(entry => entry.id === selected);
  const changed = new Set(snapshot && base ? compareVersionEntries(base.items, snapshot.items).map(change => change.id) : []);
  const note = snapshot?.items.find(item => item.id === noteId) ?? null;
  const color = version?.authors.length === 1 ? cursorColor(String(version.authors[0].id)) : 'var(--primary)';
  const content = note && showChanges && base ? diffNoteContent(base.items.find(item => item.id === note.id)?.content ?? null, note.content) : note?.content ?? null;

  const select = async (selection: Selection) => {
    const id = ++request.current;
    setSelected(selection); setError('');
    const missing = [selection, baseOf(selection)].filter((entry): entry is number => entry !== undefined && entry !== 'current' && !snapshots.has(entry));
    try {
      const details = await Promise.all(missing.map(entry => getProjectVersion(projectId, entry)));
      if (id !== request.current) return;
      const next = new Map(snapshots);
      details.forEach((detail, index) => { if (detail) next.set(missing[index], detail.snapshot); });
      setSnapshots(next);
      const target = next.get(selection);
      if (target && !target.items.some(item => item.id === noteId)) setNoteId(noteOrder(target)[0]?.itemIds[0] ?? null);
    } catch (failure) { if (id === request.current) setError(failure instanceof Error ? failure.message : 'Could not load version.'); }
  };

  const loadOlder = async () => {
    if (!history.nextCursor || busy) return;
    setBusy(true); setError('');
    try {
      const older = await getProjectHistory(projectId, history.nextCursor);
      setHistory({ ...older, versions: [...history.versions, ...older.versions] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load history.'); }
    finally { setBusy(false); }
  };

  const nameCurrent = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await createProjectVersion(projectId, name, restoreEpoch);
      const fresh = await getProjectHistory(projectId);
      setHistory(fresh); setSnapshots(new Map<Selection, VersionSnapshot>([['current', current]])); setSelected('current');
      setNaming(false); setName('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not name this version.'); }
    finally { setBusy(false); }
  };

  const when = (date: string) => mounted ? new Date(date).toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : date;

  return <div className="flex h-dvh flex-col bg-background">
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <Button asChild variant="ghost" size="icon" aria-label="Back to editor"><Link href={`/editor/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
      <h1 className="min-w-0 flex-1 truncate text-base font-medium">{version ? versionLabel(version) || when(version.createdAt) : 'Current version'}</h1>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={showChanges} onCheckedChange={setShowChanges} aria-label="Show changes" />
        <span className="hidden sm:inline">Show changes</span>
      </label>
      {version && <RestoreProjectVersionButton key={version.id} projectId={projectId} versionId={version.id} restoreEpoch={restoreEpoch} />}
    </header>
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <nav aria-label="Notes" className="shrink-0 overflow-y-auto border-b border-border p-3 md:w-60 md:border-r md:border-b-0">
        {snapshot && noteOrder(snapshot).map(group => <div key={group.title} className="mb-4">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.title}</p>
          {group.itemIds.map(itemId => {
            const item = snapshot.items.find(entry => entry.id === itemId);
            return <button key={itemId} type="button" aria-current={itemId === noteId} onClick={() => setNoteId(itemId)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted aria-[current=true]:bg-muted aria-[current=true]:font-medium">
              <span className="min-w-0 flex-1 truncate">{item?.title || 'Untitled note'}</span>
              {showChanges && changed.has(itemId) && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-label="Changed" />}
            </button>;
          })}
        </div>)}
      </nav>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto" style={{ '--history-color': color } as React.CSSProperties} data-history-diff={showChanges || undefined}>
        {!snapshot ? <p role="status" className="p-8 text-sm text-muted-foreground">Loading version…</p>
          : !note ? <p className="p-8 text-sm text-muted-foreground">This version has no notes.</p>
          : <EditorImagesProvider projectId={projectId} versionId={selected === 'current' ? undefined : selected}>
            <article className="mx-auto max-w-3xl p-4 md:p-8">
              <h2 className="mb-4 break-words font-display text-3xl" style={{ textAlign: note.titleAlign ?? 'center' }}>{note.title}</h2>
              <LexicalReadOnly key={`${selected}:${note.id}:${showChanges}`} content={content ?? ''} />
            </article>
          </EditorImagesProvider>}
      </main>
      <aside aria-label="Version history" className="flex shrink-0 flex-col border-t border-border md:w-80 md:border-t-0 md:border-l">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-base font-medium">Version history</h2>
          {!naming && <Button variant="ghost" size="sm" onClick={() => setNaming(true)}>Name current version</Button>}
        </div>
        {naming && <form className="space-y-2 px-4 pb-3" onSubmit={event => { event.preventDefault(); void nameCurrent(); }}>
          <Input autoFocus className="h-9" aria-label="Version name" placeholder="Version name" maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => { setNaming(false); setName(''); }}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>}
        {history.unavailable && <p role="alert" className="px-4 pb-3 text-sm text-destructive">Automatic history is unavailable because this project exceeds the snapshot limits. Your edits are still saved.</p>}
        {error && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{error}</p>}
        <ul className="min-h-0 flex-1 overflow-y-auto pb-4">
          {entries.map(entry => {
            const item = history.versions.find(version => version.id === entry);
            const label = item ? versionLabel(item) : 'Current version';
            return <li key={entry}>
              <button type="button" aria-current={entry === selected} onClick={() => void select(entry)} className="w-full border-l-4 border-transparent px-4 py-2.5 text-left hover:bg-muted aria-[current=true]:border-primary aria-[current=true]:bg-muted">
                {label && <span className="block text-sm font-medium">{label}</span>}
                {item && <span className={label ? 'block text-xs text-muted-foreground' : 'block text-sm font-medium'}>{when(item.createdAt)}</span>}
                {item?.authors.map(author => <span key={author.id} className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: cursorColor(String(author.id)) }} />
                  {author.username}
                </span>)}
              </button>
            </li>;
          })}
          {history.nextCursor && <li className="px-4 pt-2"><Button variant="ghost" size="sm" disabled={busy} onClick={() => void loadOlder()}>Load older versions</Button></li>}
        </ul>
      </aside>
    </div>
  </div>;
}
