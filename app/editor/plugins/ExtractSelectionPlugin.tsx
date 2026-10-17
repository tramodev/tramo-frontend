'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { EditorState } from 'lexical';
import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { extractSelection, getExtractionTrailCount, type ExtractionRequest, type ExtractionResult } from '@/lib/extract-selection-client';
import { acceptExtractionEpoch, getExtractionEpoch } from '@/lib/item-content-client';
import { applyExtractedContent, captureSelection, prepareExtraction, type CapturedSelection } from './extract-selection';
import type { Trail } from '../types';

export interface ExtractionActions {
  restoreEpoch?: number;
  beforeExtract: (id: string, state: EditorState) => Promise<void>;
  pauseItem: (id: string) => void;
  resumeItem: (id: string) => void;
  acceptPersistedItem: (id: string) => void;
  onExtracted: (sourceId: string, expectedContent: string, result: ExtractionResult, applySource: boolean) => void;
}

export default function ExtractSelectionPlugin({ projectId, itemId, trail, sharedCount, history, actions, onOpen }: {
  projectId: string; itemId: string; trail?: Trail; sharedCount: number; history: HistoryState; actions: ExtractionActions; onOpen: (result: ExtractionResult) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [available, setAvailable] = useState<{ local: boolean; reason?: string; top: number; left: number; above: boolean; container: HTMLElement } | null>(null);
  const [capture, setCapture] = useState<CapturedSelection | null>(null);
  const [title, setTitle] = useState('');
  const [leaveLink, setLeaveLink] = useState(true);
  const [placement, setPlacement] = useState<'next' | 'last' | 'outside'>('outside');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<ExtractionResult | null>(null);
  const [dialogTrail, setDialogTrail] = useState<Trail | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [usage, setUsage] = useState<number | null>(sharedCount);
  const opened = useRef(false);
  const busy = useRef(false);
  const request = useRef<ExtractionRequest | null>(null);

  useEffect(() => {
    let frame: number;
    const inspect = () => {
      if (opened.current || busy.current) return;
      const selection = window.getSelection();
      const root = editor.getRootElement();
      const container = root?.closest<HTMLElement>('.editor-inner');
      if (!root || !container || !selection || selection.isCollapsed || !selection.rangeCount
          || !root.contains(selection.anchorNode) && !root.contains(selection.focusNode)) { setAvailable(null); return; }
      const range = selection.getRangeAt(0), rect = range.getBoundingClientRect();
      const viewport = container.getBoundingClientRect();
      if (rect.bottom <= viewport.top || rect.top >= viewport.bottom) { setAvailable(null); return; }
      const local = root.contains(selection.anchorNode) && root.contains(selection.focusNode);
      const above = rect.top >= viewport.top + 44;
      setAvailable({ local, reason: local ? undefined : 'Select content inside one note. Selections across notes cannot be extracted.',
        top: (above ? rect.top - 8 : rect.bottom + 8) - viewport.top + container.scrollTop,
        left: Math.max(viewport.left + 8, Math.min(rect.left, viewport.right - 220)) - viewport.left + container.scrollLeft,
        above, container });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      if (!opened.current && !busy.current) frame = requestAnimationFrame(inspect);
    };
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const unregister = editor.registerUpdateListener(schedule);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('selectionchange', schedule); document.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); unregister(); };
  }, [editor]);

  const close = () => {
    if (busy.current) return;
    opened.current = false;
    setCapture(null); setError(''); request.current = null; setAvailable(null);
  };
  const confirm = async () => {
    if (busy.current || !capture || usage === null) return;
    busy.current = true; setPending(true); setError('');
    const editable = editor.isEditable(); editor.setEditable(false);
    let paused = false;
    try {
      if (JSON.stringify(editor.getEditorState().toJSON()) !== capture.content) throw new Error('The note changed. Close this dialog and select again.');
      if (!request.current) await actions.beforeExtract(itemId, capture.state);
      actions.pauseItem(itemId); paused = true;
      if (!request.current) {
        const operationId = crypto.randomUUID();
        const noteTitle = title.trim() || 'Untitled';
        request.current = { ...prepareExtraction(editor, capture, noteTitle, operationId, leaveLink), operationId, title: noteTitle, leaveLink, extractionEpoch: getExtractionEpoch(itemId),
          trailId: placement !== 'outside' && dialogTrail ? Number(dialogTrail.id) : null,
          appendToTrail: placement === 'last',
          expectedOrder: placement !== 'outside' && dialogTrail ? dialogTrail.itemIds.map(Number) : null };
        setSubmitted(true);
      }
      const result = await extractSelection(projectId, itemId, request.current, actions.restoreEpoch ?? 0);
      const unchanged = JSON.stringify(editor.getEditorState().toJSON()) === capture.content;
      actions.onExtracted(itemId, capture.content, result, unchanged);
      if (!unchanged) throw new Error('Extraction completed, but this editor changed while saving. Your local text was kept. Reload the project before editing further.');
      applyExtractedContent(editor, history, result.sourceContent);
      acceptExtractionEpoch(itemId, result.extractionEpoch, result.sourceContent);
      acceptExtractionEpoch(result.item.id, 0, result.item.content ?? '');
      actions.acceptPersistedItem(itemId);
      setCreated(result); setCapture(null); setAvailable(null); opened.current = false; request.current = null;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not extract this selection. Your content is unchanged.');
    } finally {
      if (paused) actions.resumeItem(itemId);
      editor.setEditable(editable); busy.current = false; setPending(false);
    }
  };
  return <>
    {available && !capture && createPortal(<div className={`absolute z-10 ${available.above ? '-translate-y-full' : ''}`} style={{ top: available.top, left: available.left }}>
      <Button size="sm" variant="ghost" className="rounded-md border border-border bg-popover shadow-elevation-2" disabled={!available.local || !!available.reason} title={available.reason} onMouseDown={event => event.preventDefault()} onClick={() => {
        if (!available.local) return;
        const result = captureSelection(editor);
        if (!result.capture) { setAvailable(result.reason ? { ...available, reason: result.reason } : null); return; }
        opened.current = true; request.current = null; setDialogTrail(trail); setSubmitted(false);
        setCapture(result.capture); setTitle(''); setLeaveLink(true); setPlacement(trail ? 'last' : 'outside'); setError(''); setCreated(null);
        setUsage(null);
        void getExtractionTrailCount(projectId, itemId).then(count => { if (opened.current) setUsage(count); })
          .catch(failure => { if (opened.current) setError(failure instanceof Error ? failure.message : 'Could not check note usage. Close and try again.'); });
      }}>Extract to new note</Button>
      {available.reason && <p role="status" className="mt-1 max-w-64 rounded-lg border border-border bg-popover px-2 py-1 text-xs text-muted-foreground">{available.reason}</p>}
    </div>, available.container)}
    <Dialog open={!!capture} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>Extract to new note</DialogTitle><DialogDescription>The selected content will move to a new note. You can leave a link here in its place. After extraction, Undo applies only to subsequent edits; it cannot undo note creation.</DialogDescription></DialogHeader>
        {usage === null ? <p role="status" className="text-sm text-muted-foreground">Checking where this note is used…</p> : usage > 1 && <p className="text-sm">This note is used in {usage} trails. Changes to this note will appear in all of them. A new step is added only to the current trail.</p>}
        <label className="text-sm">Note title (optional)<Input autoFocus placeholder="Untitled" maxLength={300} value={title} disabled={pending || submitted} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void confirm(); } }} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={leaveLink} disabled={pending || submitted} onChange={event => setLeaveLink(event.target.checked)} className="accent-primary" />Leave a link in the original note</label>
        <label className="text-sm">Create as
          <select value={placement} disabled={pending || submitted} onChange={event => setPlacement(event.target.value as typeof placement)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
            {dialogTrail && <option value="next">Next step in this trail</option>}
            {dialogTrail && <option value="last">Last step in this trail</option>}
            <option value="outside">Note outside trails</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" disabled={pending} onClick={close}>Cancel</Button><Button disabled={pending || usage === null} onClick={() => { void confirm(); }}>{pending ? 'Extracting…' : submitted ? 'Try again' : 'Extract'}</Button></div>
      </DialogContent>
    </Dialog>
    {created && <div role="status" className="flex items-center gap-2 pl-7 text-sm text-muted-foreground">Created “{created.item.title}”.<Button variant="ghost" size="sm" onClick={() => onOpen(created)}>Open note</Button><Button variant="ghost" size="sm" onClick={() => setCreated(null)}>Dismiss</Button></div>}
  </>;
}
