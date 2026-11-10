"use client";

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import { LexicalReadOnly } from '@/components/project/lexical-read-only';
import { RestoreProjectVersionButton } from '@/components/project/restore-project-version-button';
import { useMounted } from '@/hooks/use-mounted';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import { useVirtualNotes } from '@/app/editor/[projectId]/hooks/useVirtualNotes';
import { cursorColor } from '@/lib/collab-client';
import { diffNoteContent } from '@/lib/lexical-diff';
import { compareVersionEntries } from '@/lib/version-comparison';
import { createProjectVersion, getProjectHistory, getProjectVersion, type HistoryVersion, type ProjectHistory, type VersionSnapshot, type VersionState } from '@/lib/project-history';

type Selection = number | 'current';

function noteSlots(snapshot: VersionSnapshot) {
  const linked = new Set(snapshot.trails.flatMap(trail => trail.itemIds));
  return [
    ...snapshot.trails.map(trail => ({ title: trail.title, itemIds: trail.itemIds })),
    { title: 'Notes', itemIds: snapshot.items.filter(item => !linked.has(item.id)).map(item => item.id) },
  ].flatMap((group, groupIndex) => group.itemIds.map((itemId, index) => ({ slot: `${groupIndex}:${itemId}`, itemId, group: group.title, first: index === 0 })));
}

function versionLabel(version: HistoryVersion) {
  return version.name || (version.type === 'RESTORE' ? 'Before restoration' : null);
}

export function HistoryView({ projectId, restoreEpoch, initialHistory, current, latest }: {
  projectId: string;
  restoreEpoch: number;
  initialHistory: ProjectHistory;
  current: VersionState;
  latest: VersionState | null;
}) {
  const mounted = useMounted();
  const [history, setHistory] = useState(initialHistory);
  const [states, setStates] = useState<Map<Selection, VersionState>>(() => new Map<Selection, VersionState>(latest && initialHistory.versions[0] ? [['current', current], [initialHistory.versions[0].id, latest]] : [['current', current]]));
  const [selected, setSelected] = useState<Selection>('current');
  const [activeSlot, setActiveSlot] = useState<string | null>(() => noteSlots(current.snapshot)[0]?.slot ?? null);
  const [showChanges, setShowChanges] = useState(true);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const columnRef = useRef<HTMLElement>(null);
  const slotRefs = useRef(new Map<string, HTMLElement>());

  const entries: Selection[] = ['current', ...history.versions.map(version => version.id)];
  const baseOf = (selection: Selection) => entries[entries.indexOf(selection) + 1];
  const state = states.get(selected);
  const base = states.get(baseOf(selected))?.snapshot;
  const version = history.versions.find(entry => entry.id === selected);
  const slots = useMemo(() => state ? noteSlots(state.snapshot) : [], [state]);
  const slotIds = useMemo(() => slots.map(entry => entry.slot), [slots]);
  const changed = new Set(state && base ? compareVersionEntries(base.items, state.snapshot.items).map(change => change.id) : []);
  const authorsOf = (itemId: number) => state?.itemAuthors[itemId] ?? [];
  const colorOf = (itemId: number) => { const authors = authorsOf(itemId); return authors.length === 1 ? cursorColor(String(authors[0].id)) : 'var(--primary)'; };
  const { visibleIds, selectionIds, heights } = useVirtualNotes(columnRef, slotRefs, slotIds, !!state);
  const pin = useScrollSpy({ root: columnRef, slots: slotRefs, ids: slotIds, enabled: !!state, onVisible: setActiveSlot });

  const jump = (slot: string | null) => {
    pin(); setActiveSlot(slot);
    requestAnimationFrame(() => {
      const element = slot ? slotRefs.current.get(slot) : null;
      if (element) element.scrollIntoView({ block: 'start' });
      else columnRef.current?.scrollTo({ top: 0 });
    });
  };

  const select = async (selection: Selection) => {
    const id = ++request.current;
    setSelected(selection); setError('');
    const missing = [selection, baseOf(selection)].filter((entry): entry is number => entry !== undefined && entry !== 'current' && !states.has(entry));
    try {
      const details = await Promise.all(missing.map(entry => getProjectVersion(projectId, entry)));
      if (id !== request.current) return;
      setStates(previous => {
        const next = new Map(previous);
        details.forEach((detail, index) => { if (detail) next.set(missing[index], detail); });
        return next;
      });
      const target = states.get(selection) ?? details[missing.indexOf(selection as number)];
      if (target) jump(noteSlots(target.snapshot).some(entry => entry.slot === activeSlot) ? activeSlot : noteSlots(target.snapshot)[0]?.slot ?? null);
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
      setHistory(fresh); setStates(new Map<Selection, VersionState>([['current', { ...current, itemAuthors: {} }]])); setSelected('current');
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
      <nav aria-label="Notes" className="max-h-40 shrink-0 overflow-y-auto border-b border-border p-3 md:max-h-none md:w-60 md:border-r md:border-b-0">
        {state && slots.map(entry => {
          const item = state.snapshot.items.find(candidate => candidate.id === entry.itemId);
          return <div key={entry.slot}>
            {entry.first && <p className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground first:pt-0">{entry.group}</p>}
            <button type="button" aria-current={entry.slot === activeSlot} onClick={() => jump(entry.slot)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted aria-[current=true]:bg-muted aria-[current=true]:font-medium">
              <span className="min-w-0 flex-1 truncate">{item?.title || 'Untitled note'}</span>
              {showChanges && changed.has(entry.itemId) && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(entry.itemId) }} aria-label="Changed" />}
            </button>
          </div>;
        })}
      </nav>
      <main ref={columnRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto" data-history-diff={showChanges || undefined}>
        {!state ? <p role="status" className="p-8 text-sm text-muted-foreground">Loading version…</p>
          : !slots.length ? <p className="p-8 text-sm text-muted-foreground">This version has no notes.</p>
          : <EditorImagesProvider projectId={projectId} versionId={selected === 'current' ? undefined : selected}>
            <div className="mx-auto max-w-3xl p-4 md:p-8">
              {slots.map(entry => {
                const note = state.snapshot.items.find(item => item.id === entry.itemId);
                if (!note) return null;
                const authors = authorsOf(note.id);
                const live = entry.slot === activeSlot || visibleIds.has(entry.slot) || selectionIds.has(entry.slot);
                const content = showChanges && base ? diffNoteContent(base.items.find(item => item.id === note.id)?.content ?? null, note.content) : note.content;
                return <section key={entry.slot} data-item-id={entry.slot} data-mounted={live} tabIndex={-1} aria-label={note.title || 'Untitled note'}
                  ref={element => { if (element) slotRefs.current.set(entry.slot, element); else slotRefs.current.delete(entry.slot); }}
                  className="scroll-mt-4 border-b border-border py-8 last:border-b-0"
                  style={{ '--history-color': colorOf(note.id), ...(live ? {} : { height: heights.get(entry.slot) ?? 240, overflow: 'hidden' }) } as React.CSSProperties}>
                  {entry.first && <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{entry.group}</p>}
                  <h2 className="break-words font-display text-3xl" style={{ textAlign: note.titleAlign ?? 'center' }}>{note.title}</h2>
                  {showChanges && changed.has(note.id) && authors.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    Edited by
                    {authors.map(author => <span key={author.id} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: cursorColor(String(author.id)) }} />
                      @{author.username}
                    </span>)}
                  </p>}
                  <div className="mt-4">{live && <LexicalReadOnly key={`${selected}:${showChanges}:${!!base}`} content={content ?? ''} />}</div>
                </section>;
              })}
            </div>
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
