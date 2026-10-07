'use client';

import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ExportProjectButton({ projectId, beforeExport }: { projectId: string; beforeExport: () => Promise<void> }) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const exportProject = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await beforeExport();
      const response = await fetch(`/api/projects/${projectId}/export`, { method: 'POST' });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.message ?? 'Could not export this project. Please try again.');
      }
      if (!response.headers.get('Content-Type')?.includes('application/zip')) throw new Error('The export response was invalid. Please try again.');
      const blob = await response.blob();
      if (!blob.size || blob.size > 129 * 1024 * 1024) throw new Error('The export exceeds the supported download size.');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tramo-project-${projectId}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not export this project. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return <>
    <Button variant="ghost" size="icon" disabled={pending} onClick={() => { void exportProject(); }} title="Export" aria-label="Export">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
    <Dialog open={pending || !!error} onOpenChange={open => { if (!open && !pending) setError(''); }}>
      <DialogContent showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>{pending ? 'Preparing project export…' : 'Could not export project'}</DialogTitle>
          <DialogDescription>{pending ? 'Saving pending changes and gathering the project and its images. This may take a moment.' : 'Your project is unchanged. Resolve the error or try again.'}</DialogDescription></DialogHeader>
        {pending ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Preparing download…</p> : <>
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setError('')}>Close</Button><Button onClick={() => { void exportProject(); }}>Try again</Button></div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
