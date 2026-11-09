'use client';

import { useRef, useState } from 'react';
import { Download, FileCode, FilePen, FileText, FileType, Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ExportOption = { value: string; label: string; description: string; icon: LucideIcon; type: string; suffix: string };

const FORMAT_OPTIONS = [
  { value: 'md', label: 'Markdown', description: 'Plain text notes with images, zipped', icon: FileText, type: 'application/zip', suffix: '-md.zip' },
  { value: 'html', label: 'HTML', description: 'Offline web page with images, zipped', icon: FileCode, type: 'application/zip', suffix: '.zip' },
  { value: 'pdf', label: 'PDF', description: 'Single document, ready to print or share', icon: FileType, type: 'application/pdf', suffix: '.pdf' },
  { value: 'docx', label: 'Word', description: 'Editable .docx document', icon: FilePen, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', suffix: '.docx' },
] as const satisfies readonly ExportOption[];

const downloadName = (disposition: string | null) => {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch {}
  }
  return disposition?.match(/filename="([^"]+)"/i)?.[1] ?? null;
};

export function ExportProjectButton({ projectId, beforeExport }: { projectId: string; beforeExport: () => Promise<void> }) {
  const busy = useRef(false);
  const last = useRef<ExportOption>(FORMAT_OPTIONS[1]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const exportProject = async (option: ExportOption) => {
    if (busy.current) return;
    busy.current = true;
    last.current = option;
    setPending(true);
    setError('');
    try {
      await beforeExport();
      const response = await fetch(`/api/projects/${projectId}/export?format=${option.value}`, { method: 'POST' });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.message ?? 'Could not export this project. Please try again.');
      }
      if (!response.headers.get('Content-Type')?.includes(option.type)) throw new Error('The export response was invalid. Please try again.');
      const blob = await response.blob();
      if (!blob.size || blob.size > 129 * 1024 * 1024) throw new Error('The export exceeds the supported download size.');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName(response.headers.get('Content-Disposition')) ?? `tramo-project-${projectId}${option.suffix}`;
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={pending}>
        <Button variant="ghost" size="icon" title="Export" aria-label="Export">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5">
        {FORMAT_OPTIONS.map(option => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem key={option.value} onSelect={() => { void exportProject(option); }} className="items-start gap-3 rounded-md px-3 py-2.5">
              <Icon className="mt-0.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={pending || !!error} onOpenChange={open => { if (!open && !pending) setError(''); }}>
      <DialogContent showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>{pending ? 'Preparing project export…' : 'Could not export project'}</DialogTitle>
          <DialogDescription>{pending ? 'Saving pending changes and gathering the project and its images. This may take a moment.' : 'Your project is unchanged. Resolve the error or try again.'}</DialogDescription></DialogHeader>
        {pending ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Preparing download…</p> : <>
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setError('')}>Close</Button><Button onClick={() => { void exportProject(last.current); }}>Try again</Button></div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
