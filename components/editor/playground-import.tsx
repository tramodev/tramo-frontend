'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { hasPlaygroundContent, importPlayground, playgroundEditorHref, PLAYGROUND_STORAGE_KEY } from '@/app/playground/playground-import';

const readPlayground = () => { try { return localStorage.getItem(PLAYGROUND_STORAGE_KEY); } catch { return null; } };

export function PlaygroundImport({ userId }: { userId: string | null }) {
  const [raw, setRaw] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const refresh = () => { if (!cancelled) setRaw(readPlayground()); };
    void Promise.resolve().then(refresh);
    window.addEventListener('storage', refresh);
    return () => { cancelled = true; window.removeEventListener('storage', refresh); };
  }, [userId]);
  if (!userId || !raw || !hasPlaygroundContent(raw)) return null;
  return <section className="container-app px-5 pb-8 sm:px-10 lg:px-12">
    <h2 className="mb-2 text-sm font-medium">Notes from the playground</h2>
    <p className="mb-3 text-xs text-muted-foreground">You wrote these in the playground on this browser. Save them as a project to keep them in your account.</p>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={saving} onClick={() => {
        setSaving(true);
        setError('');
        importPlayground(raw).then(result => window.location.assign(playgroundEditorHref(result)), (failure: unknown) => {
          setError(failure instanceof Error ? failure.message : 'Could not save the playground.');
          setSaving(false);
        });
      }}>{saving ? 'Saving…' : 'Save as project'}</Button>
      <Button variant="ghost" size="sm" asChild><a href="/playground">Open playground</a></Button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </section>;
}
