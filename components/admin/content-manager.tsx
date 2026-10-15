'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteSiteContent, saveSiteContent, type BlogPost, type ChangelogEntry, type ContentKind, type RoadmapItem, type SiteContent } from '@/lib/site-content';

type ContentEntry = BlogPost | ChangelogEntry | RoadmapItem;
const LABELS = { blog: 'Blog', changelog: 'Changelog', roadmap: 'Roadmap' };
const KINDS: ContentKind[] = ['blog', 'changelog', 'roadmap'];

export function ContentManager({ content }: { content: SiteContent }) {
  const router = useRouter();
  const [kind, setKind] = useState<ContentKind>('blog');
  const [editing, setEditing] = useState<ContentEntry | null>();
  const [deleteTarget, setDeleteTarget] = useState<ContentEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteSiteContent(kind, deleteTarget.id);
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError('Could not delete the entry. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (editing !== undefined) return <ContentEditor kind={kind} entry={editing} onCancel={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />;

  return <>
    <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Content sections">
      {KINDS.map(value => <Button key={value} variant={kind === value ? 'secondary' : 'ghost'} aria-pressed={kind === value} disabled={deleting} onClick={() => { setKind(value); setError(null); }}>{LABELS[value]}</Button>)}
    </div>
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-display text-xl font-medium">{LABELS[kind]}</h2>
      <Button disabled={deleting} onClick={() => setEditing(null)}>New entry</Button>
    </div>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <ul className="divide-y divide-border border-y border-border">
      {content[kind].map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="break-words font-medium">{entry.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{entry.published ? 'Published' : 'Draft'}{'publishedDate' in entry && ` · ${entry.publishedDate}`}{'status' in entry && ` · ${entry.status.replaceAll('_', ' ').toLowerCase()} · Order ${entry.position}`}</p>
        </div>
        <div className="flex gap-2">
          {'slug' in entry && entry.published && <Button asChild size="sm" variant="ghost"><Link href={`/blog/${entry.slug}`} target="_blank">View</Link></Button>}
          <Button size="sm" variant="outline" disabled={deleting} onClick={() => setEditing(entry)}>Edit</Button>
          <Button size="sm" variant="destructive" disabled={deleting} onClick={() => setDeleteTarget(entry)}>Delete</Button>
        </div>
      </li>)}
    </ul>
    {content[kind].length === 0 && <p className="mt-4 text-sm text-muted-foreground">No entries yet.</p>}
    <ConfirmDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)} title="Delete this entry?" description={`“${deleteTarget?.title}” will be permanently removed, including from the public page.`} onConfirm={handleDelete} />
  </>;
}

function ContentEditor({ kind, entry, onCancel, onSaved }: { kind: ContentKind; entry: ContentEntry | null; onCancel: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const result = await saveSiteContent(kind, entry?.id ?? null, form);
      if (result.error) setError(result.error);
      else onSaved();
    } catch {
      setError('Could not save the entry. Your text is still here; please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={handleSubmit}>
    <h2 className="mb-6 font-display text-xl font-medium">{entry ? 'Edit' : 'New'} {LABELS[kind].toLowerCase()} entry</h2>
    <fieldset disabled={saving} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="content-title">Title</Label><Input id="content-title" name="title" defaultValue={entry?.title ?? ''} required maxLength={200} /></div>
      {kind === 'blog' && <>
        <div className="space-y-2"><Label htmlFor="content-slug">Slug</Label><Input id="content-slug" name="slug" defaultValue={entry && 'slug' in entry ? entry.slug : ''} required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-describedby="slug-hint" /><p id="slug-hint" className="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens. Changing this changes the public URL.</p></div>
        <div className="space-y-2"><Label htmlFor="content-category">Category</Label><Input id="content-category" name="category" defaultValue={entry && 'category' in entry ? entry.category : ''} required maxLength={80} /></div>
        <div className="space-y-2"><Label htmlFor="content-summary">Summary</Label><Textarea id="content-summary" name="summary" defaultValue={entry && 'summary' in entry ? entry.summary : ''} required maxLength={1000} rows={3} /></div>
      </>}
      {kind !== 'roadmap' && <div className="space-y-2"><Label htmlFor="content-date">Publication date</Label><Input id="content-date" name="publishedDate" type="date" defaultValue={entry && 'publishedDate' in entry ? entry.publishedDate : new Date().toISOString().slice(0, 10)} required /><p className="text-xs text-muted-foreground">Display date, not a scheduled publication.</p></div>}
      {kind === 'roadmap' && <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="content-status">Status</Label><select id="content-status" name="status" defaultValue={entry && 'status' in entry ? entry.status : 'PLANNED'} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="PLANNED">Planned</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div>
        <div className="space-y-2"><Label htmlFor="content-position">Order</Label><Input id="content-position" name="position" type="number" min={0} max={2147483647} step={1} defaultValue={entry && 'position' in entry ? entry.position : 0} required /></div>
      </div>}
      <div className="space-y-2"><Label htmlFor="content-body">{kind === 'roadmap' ? 'Description' : 'Content'}</Label><Textarea id="content-body" name="content" defaultValue={entry ? ('content' in entry ? entry.content : entry.description) : ''} rows={kind === 'blog' ? 16 : 6} maxLength={kind === 'blog' ? 200000 : 20000} required={kind !== 'blog'} /><p className="text-xs text-muted-foreground">Plain text. Line breaks are preserved.</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={entry?.published ?? false} className="accent-primary" />Published · visible to everyone</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button type="submit">{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
    </fieldset>
  </form>;
}
