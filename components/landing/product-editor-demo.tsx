'use client';

import { useState } from 'react';
import { $createParagraphNode, $createTextNode, $getRoot, FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { $createLinkNode, LinkNode } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { AlignLeft, Baseline, Bold, ChevronDown, Code, Highlighter, Italic, Link2, Plus, Redo, RotateCcw, Search, Strikethrough, Underline, Undo, X } from 'lucide-react';
import { Mark } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SharedNoteIndicator } from '@/components/editor/shared-note-indicator';
import ItemMentionPlugin from '@/app/editor/plugins/ItemMentionPlugin';
import { itemIdFromRel } from '@/app/editor/plugins/itemLink';
import type { Item } from '@/app/editor/types';
import { cn } from '@/lib/utils';
import '@/app/editor/Editor.css';

const NOTES = {
  bush: { title: 'Vannevar Bush', text: 'Vannevar Bush imagined a way to follow ideas through connected records. Instead of filing everything in one place, a reader could build a trail through the material.', related: 'essay' },
  essay: { title: 'As We May Think', text: 'In his 1945 essay, Bush described the Memex: a device for keeping books, records and communications, and following connections between them.', related: 'memex' },
  memex: { title: 'Memex', text: 'The Memex was a proposed device for storing and consulting a person’s books, records and communications. Bush imagined a desk with screens and microfilm.\n\nIts distinctive idea was associative access: a reader could connect records and follow those connections later.', related: 'essay' },
  trails: { title: 'Associative trails', text: 'An associative trail is a named path through connected records. The same note can belong to several trails, each with its own context and order.', related: 'memex' },
  sharing: { title: 'Sharing a trail', text: 'Share a path through your ideas, so someone else can follow your explanation and explore the connected notes.', related: 'memex' },
} as const;

type NoteId = keyof typeof NOTES;

const DEMO_ITEMS: Record<string, Item> = Object.fromEntries(Object.entries(NOTES).map(([id, note]) => [id, {
  id, title: note.title, titleAlign: 'left', unfiled: false, content: null,
}]));

const TRAILS: { title: string; notes: NoteId[] }[] = [
  { title: 'Bush’s vision', notes: ['bush', 'essay', 'memex'] },
  { title: 'Thinking in trails', notes: ['memex', 'trails', 'sharing'] },
];

function DemoToolbar() {
  const [editor] = useLexicalComposerContext();
  return <div className="mx-auto mt-3 flex w-[90%] shrink-0 items-center gap-1 overflow-hidden rounded-[24px] bg-muted px-3 py-2 [&>*]:shrink-0 [&>button:hover]:bg-accent">
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Undo" onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}><Undo className="size-4" /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Redo" onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}><Redo className="size-4" /></Button>
    <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Bold" onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}><Bold className="size-4" /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Italic" onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}><Italic className="size-4" /></Button>
    {[Underline, Strikethrough, Highlighter, Baseline, AlignLeft, Code, Link2, Plus].map(Icon => <span key={Icon.displayName} aria-hidden="true" className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-accent"><Icon className="size-4" /></span>)}
  </div>;
}

export function ProductEditorDemo({ variant }: { variant: 'connections' | 'shared' }) {
  const [selected, setSelected] = useState<{ note: NoteId; trail: number }>({ note: 'memex', trail: 0 });
  const [contents, setContents] = useState<Partial<Record<NoteId, string>>>({});
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const note = NOTES[selected.note];
  const memberTrails = TRAILS.filter(trail => trail.notes.includes(selected.note));
  const connectedNotes = (Object.keys(NOTES) as NoteId[]).filter(id => id !== selected.note && (id === note.related || NOTES[id].related === selected.note));

  function openNote(id: NoteId, trail = TRAILS.findIndex(candidate => candidate.notes.includes(id))) {
    setSelected({ note: id, trail });
  }

  return <div className={cn('@container flex h-[35rem] flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground [overflow-anchor:none]', variant === 'connections' ? 'rounded-r-none border-r-0 lg:w-[110%]' : 'rounded-l-none border-l-0')}>
    <div className={cn('grid min-h-0 flex-1 overflow-hidden', variant === 'connections' ? 'grid-rows-1 @min-[36rem]:grid-cols-[12rem_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)_auto] @min-[28rem]:grid-cols-[minmax(0,1fr)_16rem] @min-[28rem]:grid-rows-1')}>
      {variant === 'connections' && <nav aria-label="Demo trails" className="hidden min-h-0 min-w-0 overflow-y-auto border-r border-border bg-sidebar p-3 @min-[36rem]:block">
        <div className="mb-4 flex items-center gap-2">
          <Mark size={22} className="shrink-0" />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input aria-label="Search demo notes" placeholder="Search this project" value={query} onChange={event => setQuery(event.target.value)} className="h-8 rounded-full pr-2 pl-7 text-xs md:text-xs" />
          </div>
        </div>
        <details open>
          <summary className="mb-3 flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground"><ChevronDown className="size-3" />Trails</summary>
          <div className="grid grid-cols-2 gap-3 @min-[36rem]:grid-cols-1 @min-[36rem]:gap-4">
        {TRAILS.map((trail, trailIndex) => <div key={trail.title}>
          <button type="button" className="mb-2 flex w-full items-center gap-1 text-left text-xs font-medium hover:underline" onClick={() => openNote('memex', trailIndex)}>
            <ChevronDown className="size-3 shrink-0" />{trail.title}
          </button>
          <ol className="space-y-1 border-l border-sidebar-border">
            {trail.notes.map((id, index) => NOTES[id].title.toLowerCase().includes(query.trim().toLowerCase()) && <li key={id}>
              <button type="button" aria-current={selected.note === id && selected.trail === trailIndex ? 'page' : undefined} onClick={() => openNote(id, trailIndex)} className={cn('flex w-full min-w-0 items-center gap-2 rounded-r-md px-2 py-2 text-left text-xs hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring', selected.note === id && selected.trail === trailIndex && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground')}>
                <span className="text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate">{NOTES[id].title}</span>
                {id === 'memex' && <SharedNoteIndicator trails={TRAILS} />}
              </button>
            </li>)}
          </ol>
        </div>)}
          </div>
        </details>
      </nav>}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Memex and Vannevar Bush</span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Reset demo" onClick={() => { setContents({}); setRevision(value => value + 1); }}><RotateCcw className="size-4" /></Button>
        </div>
        <LexicalComposer key={`${selected.note}-${revision}`} initialConfig={{
          namespace: `landing-${variant}`,
          nodes: [LinkNode],
          theme: { paragraph: 'mb-4 last:mb-0', text: { bold: 'font-bold', italic: 'italic' }, link: 'text-[var(--ed-blue)] underline underline-offset-2 cursor-pointer' },
          onError(error) { throw error; },
          editorState: contents[selected.note] ?? (() => {
            const root = $getRoot();
            for (const text of note.text.split('\n\n')) root.append($createParagraphNode().append($createTextNode(text)));
            root.append($createParagraphNode().append($createLinkNode(`#${note.related}`).append($createTextNode(`@${NOTES[note.related].title}`))));
          }),
        }}>
          <DemoToolbar />
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6', variant === 'connections' && 'pb-10 sm:pb-[3.25rem] lg:pr-[calc(100cqw/11+1.5rem)]')}>
            <h4 className="mb-3 font-display text-2xl font-medium">{note.title}</h4>
            {memberTrails.length > 1 && <div className="mb-5 text-xs leading-relaxed text-muted-foreground">
              <p>Used in 2 trails. Edits appear in both.</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{TRAILS.map((trail, index) => <button key={trail.title} type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => openNote('memex', index)}>{trail.title}</button>)}</div>
            </div>}
            <div onMouseDownCapture={event => {
              if ((event.target as HTMLElement).closest('a')) event.preventDefault();
            }} onClickCapture={event => {
              const link = (event.target as HTMLElement).closest('a');
              if (!link) return;
              event.preventDefault();
              event.stopPropagation();
              const id = itemIdFromRel(link.getAttribute('rel') ?? '') ?? link.getAttribute('href')?.slice(1);
              if (id && Object.hasOwn(NOTES, id)) openNote(id as NoteId);
            }}>
              <RichTextPlugin contentEditable={<ContentEditable aria-label={`${note.title} demo editor`} className="min-h-40 break-words text-sm leading-relaxed outline-none [&_p]:min-h-5" />} placeholder={null} ErrorBoundary={LexicalErrorBoundary} />
            </div>
          </div>
          <HistoryPlugin />
          <ItemMentionPlugin items={DEMO_ITEMS} currentItemId={selected.note} />
          <OnChangePlugin ignoreSelectionChange onChange={state => setContents(previous => ({ ...previous, [selected.note]: JSON.stringify(state.toJSON()) }))} />
        </LexicalComposer>
      </div>
      {variant === 'shared' && <aside aria-label="Demo connections" className="m-3 max-h-48 min-h-0 min-w-0 space-y-3 overflow-y-auto rounded-2xl border border-border bg-popover p-3 @min-[28rem]:max-h-none">
        <div className="flex items-center justify-between gap-2"><h5 className="text-sm font-medium">Connections ({connectedNotes.length})</h5><X aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></div>
        <p className="text-xs leading-relaxed text-muted-foreground">Connections involving “{note.title}”.</p>
        {connectedNotes.map(id => <button key={id} type="button" aria-label={`Open ${NOTES[id].title}`} className="block w-full space-y-2 rounded-lg border border-border p-3 text-left hover:bg-muted" onClick={() => openNote(id)}>
          <span className="block text-sm">{id === note.related ? `${note.title} — ${NOTES[id].title}` : `${NOTES[id].title} — ${note.title}`}</span>
          <span className="block text-xs text-muted-foreground">@ mention in {id === note.related ? note.title : NOTES[id].title}</span>
        </button>)}
      </aside>}
    </div>
  </div>;
}
