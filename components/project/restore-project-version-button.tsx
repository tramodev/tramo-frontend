"use client";

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { restoreProjectVersion } from '@/lib/project-history';

export function RestoreProjectVersionButton({ projectId, versionId, restoreEpoch }: { projectId: string; versionId: number; restoreEpoch: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = useRef(false);

  const restore = async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    try {
      await restoreProjectVersion(projectId, versionId, restoreEpoch);
      router.push(`/editor/${projectId}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not restore version.');
      action.current = false; setBusy(false);
    }
  };

  return <div className="flex flex-wrap items-center gap-2">
    {error && <p role="alert" className="max-w-xs text-xs text-destructive">{error}</p>}
    <Button disabled={busy} onClick={() => setConfirm(true)}>{busy ? 'Restoring…' : 'Restore this version'}</Button>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Restore this version?" description="Your current saved project will be kept as a safety version before restoring. This replaces the draft, including its notes and trail order. Unsaved edits in other tabs will not be restored." confirmLabel="Restore version" destructive={false} onConfirm={() => void restore()} />
  </div>;
}
