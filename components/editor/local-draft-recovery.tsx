'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { discardDraft, listDrafts, recoverDraft, type DraftBackup } from '@/lib/editor-draft';

export function LocalDraftRecovery({ userId }: { userId: string | null }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftBackup[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const refresh = () => { if (!cancelled) setDrafts(listDrafts(userId)); };
    void Promise.resolve().then(refresh);
    window.addEventListener('storage', refresh);
    return () => { cancelled = true; window.removeEventListener('storage', refresh); };
  }, [userId]);
  if (!userId || !drafts.length) return null;
  return <section className="container-app px-5 pb-8 sm:px-10 lg:px-12">
    <h2 className="mb-2 text-sm font-medium">Unsaved drafts in this browser</h2>
    <p className="mb-3 text-xs text-muted-foreground">These drafts have not finished syncing and are only available on this device.</p>
    <ul className="divide-y divide-border rounded-lg border border-border px-4">
      {drafts.map(draft => <li key={draft.clientRequestId} className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0 truncate text-sm">{draft.latest.project.title || draft.latest.item.title || 'Untitled draft'}</span>
        <span className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            try { recoverDraft(userId, draft.clientRequestId); router.push('/editor/new'); }
            catch { setError('Could not restore this local draft. Keep this browser open and try again.'); }
          }}>Recover</Button>
          <Button variant="ghost" size="sm" onClick={() => {
            try { discardDraft(userId, draft.clientRequestId); setDrafts(listDrafts(userId)); }
            catch { setError('Could not discard this local draft.'); }
          }}>Discard</Button>
        </span>
      </li>)}
    </ul>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </section>;
}
