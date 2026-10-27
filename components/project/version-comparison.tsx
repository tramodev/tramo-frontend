import Link from 'next/link';
import { LexicalReadOnly } from '@/components/project/lexical-read-only';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import { compareVersionEntries } from '@/lib/version-comparison';
import type { VersionDetail } from '@/lib/project-history';

export function VersionComparison({ projectId, before, after }: { projectId: string; before: VersionDetail; after: VersionDetail }) {
  const notes = compareVersionEntries(before.snapshot.items, after.snapshot.items);
  const trails = compareVersionEntries(before.snapshot.trails, after.snapshot.trails);
  const metadataChanged = before.snapshot.title !== after.snapshot.title || before.snapshot.description !== after.snapshot.description;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <Link href={`/editor/${projectId}`} className="text-sm text-primary underline">Back to editor</Link>
    <h1 className="font-display text-3xl">Compare versions</h1>
    <p className="text-sm text-muted-foreground">{notes.length} changed notes · {trails.length} changed trails{metadataChanged ? ' · Project details changed' : ''}</p>
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      {([before, after] as const).map((detail, side) => <section key={detail.version.id} aria-label={side === 0 ? 'Earlier version' : 'Later version'} className="min-w-0 space-y-4">
        <header className="space-y-1 border-b border-border pb-4">
          <h2 className="text-lg font-medium">{side === 0 ? 'Earlier' : 'Later'}: {detail.version.name || detail.version.type}</h2>
          <p className="text-sm text-muted-foreground"><time dateTime={detail.version.createdAt}>{new Date(detail.version.createdAt).toLocaleString()}</time>{detail.version.authorUsername && ` · @${detail.version.authorUsername}`}</p>
          <Link className="text-sm text-primary underline" href={`/projects/${projectId}/history/${detail.version.id}`}>Open full preview</Link>
        </header>
        {metadataChanged && <div className="rounded-md border border-border p-4"><h3 className="font-medium">{detail.snapshot.title}</h3><p className="whitespace-pre-wrap text-sm">{detail.snapshot.description}</p></div>}
        {trails.map(change => {
          const trail = side === 0 ? change.before : change.after;
          return <div key={change.id} className="rounded-md border border-border p-4">
            <p className="text-xs text-muted-foreground">Trail · {change.status}</p>
            {trail ? <><h3 className="font-medium">{trail.title}</h3><p className="whitespace-pre-wrap text-sm">{trail.description}</p><ol className="list-inside list-decimal text-sm">{trail.itemIds.map(id => <li key={id}>{detail.snapshot.items.find(item => item.id === id)?.title || 'Untitled note'}</li>)}</ol></> : <p className="text-sm text-muted-foreground">Absent in this version</p>}
          </div>;
        })}
        <EditorImagesProvider projectId={projectId} versionId={detail.version.id}>
          <div className="space-y-4">{notes.map(change => {
            const note = side === 0 ? change.before : change.after;
            return <article key={change.id} className="min-w-0 overflow-x-auto rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground">Note · {change.status}</p>
              {note ? <><h3 className="break-words font-display text-xl" style={{ textAlign: note.titleAlign ?? 'center' }}>{note.title}</h3><LexicalReadOnly content={note.content ?? ''} /></> : <p className="text-sm text-muted-foreground">Absent in this version</p>}
            </article>;
          })}</div>
        </EditorImagesProvider>
      </section>)}
    </div>
    {!metadataChanged && !notes.length && !trails.length && <p>No changes to project details, notes or trails.</p>}
  </main>;
}
