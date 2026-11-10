"use client";

import { useState } from 'react';
import { ExternalLink, History } from 'lucide-react';
import Link from 'next/link';
import { Row } from '@/components/profile/row';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getProjectSnapshots, type ProjectSnapshotSummary } from '@/lib/project-snapshots';

export function PublishHistorySheet({ projectId }: { projectId: string }) {
  const [publications, setPublications] = useState<ProjectSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError(''); setPublications([]);
    try { setPublications(await getProjectSnapshots(projectId)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load publish history.'); }
    finally { setLoading(false); }
  };

  return <Sheet onOpenChange={open => { if (open) void load(); }}>
    <SheetTrigger asChild><Button variant="ghost" size="icon" title="Publish history" aria-label="Publish history"><History className="h-[15px] w-[15px]" /></Button></SheetTrigger>
    <SheetContent className="overflow-y-auto sm:max-w-lg">
      <SheetHeader className="pr-12"><SheetTitle>Publish history</SheetTitle><SheetDescription>Every time you publish, a new version is saved here.</SheetDescription></SheetHeader>
      <div className="flex flex-col gap-1 px-4 pb-4 [&>div]:rounded-none" aria-busy={loading}>
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading publish history…</p>}
        {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" onClick={() => void load()}>Retry</Button></div>}
        {!loading && !error && publications.length === 0 && <p className="text-sm text-muted-foreground">No published versions yet.</p>}
        {publications.map(version => <Row key={version.id}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Version {version.version}</span>
            <span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</span>
          </div>
          <Link href={`/p/${projectId}/versions/${version.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open version ${version.version} in a new tab`} className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Open link <ExternalLink className="h-3 w-3" />
          </Link>
        </Row>)}
      </div>
    </SheetContent>
  </Sheet>;
}
