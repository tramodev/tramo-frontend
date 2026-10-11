// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import {
  Undo,
  Redo,
  Search,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Baseline,
  Link as LinkIcon,
  Plus,
  Share2,
  Check,
  Download,
  History,
  Type,
  AlignLeft,
  Highlighter,
  PanelLeft,
  Keyboard,
  CircleHelp,
  X,
  Lock,
} from 'lucide-react';
import { Mark } from '@/components/layout/logo';
import type { Item, Trail } from '@/app/editor/types';

const GRAPH_ITEMS: Record<string, Item> = {
  'vannevar-bush': {
    id: 'vannevar-bush',
    title: 'Vannevar Bush',
    titleAlign: 'left',
    unfiled: false,
    content: null,
  },
  'as-we-may-think': {
    id: 'as-we-may-think',
    title: 'As We May Think',
    titleAlign: 'left',
    unfiled: false,
    content: null,
  },
  memex: {
    id: 'memex',
    title: 'Memex',
    titleAlign: 'left',
    unfiled: false,
    content: null,
  },
  'associative-trails': {
    id: 'associative-trails',
    title: 'Associative trails',
    titleAlign: 'left',
    unfiled: false,
    content: null,
  },
  'sharing-a-trail': {
    id: 'sharing-a-trail',
    title: 'Sharing a trail',
    titleAlign: 'left',
    unfiled: false,
    content: null,
  },
};

const GRAPH_TRAILS: Trail[] = [
  {
    id: 'bushs-vision',
    title: 'Bush’s vision',
    description: 'Meet Vannevar Bush, read the idea behind his essay, and explore the Memex.',
    itemIds: ['vannevar-bush', 'as-we-may-think', 'memex'],
    steps: [
      { itemId: 'vannevar-bush'},
      { itemId: 'as-we-may-think' },
      { itemId: 'memex'},
    ],
    version: 1,
    forkedFrom: null,
  },
  {
    id: 'thinking-in-trails',
    title: 'Thinking in trails',
    description: 'Explore how the Memex connects notes into reusable trails.',
    itemIds: ['memex', 'associative-trails', 'sharing-a-trail'],
    steps: [
      { itemId: 'memex'},
      { itemId: 'associative-trails'},
      { itemId: 'sharing-a-trail'},
    ],
    version: 1,
    forkedFrom: null,
  },
];

const TRAILS = GRAPH_TRAILS.map(trail => ({
  title: trail.title,
  items: trail.itemIds.map(id => ({ title: GRAPH_ITEMS[id].title, active: id === 'memex' && trail.id === 'bushs-vision' })),
}));

const LOOSE_ITEMS = Object.values(GRAPH_ITEMS).map(item => ({
  title: item.title,
  linked: item.id === 'memex',
}));

const CONNECTIONS = [
  'Memex — As We May Think',
  'Memex — Associative trails',
];

export const BrowserMockup: React.FC = () => {
  return (
    <div className="w-full flex flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-elevation-2">
      <div className="h-9 flex items-center gap-2 px-4 shrink-0 bg-card border-b border-border">
        <span className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ed-red)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ed-orange)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ed-green)' }} />
        </span>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-popover px-3 py-1 text-[11px] text-muted-foreground max-w-[60%] truncate">
          <Lock className="w-2.5 h-2.5 shrink-0" />
          tramo.app/memex
        </div>
      </div>
      <div className="relative aspect-[16/9] overflow-hidden [container-type:inline-size]">
      <div
        className="absolute top-1/2 left-1/2 flex h-[383px] w-[680px] overflow-hidden [transform:translate(-50%,-50%)_scale(calc(100cqw/680px))] md:static md:h-full md:w-full md:[transform:none]"
      >
        <div className="w-[184px] hidden lg:flex flex-col shrink-0 p-2.5 gap-2.5 overflow-hidden bg-card border-r border-border">
          <div className="flex items-center gap-2 pt-0.5">
            <Mark size={22} className="shrink-0" />
            <div className="flex flex-1 items-center gap-1.5 rounded-full bg-popover px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <Search className="w-3 h-3 shrink-0" />
              Search this project
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              Trails
            </h3>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            {TRAILS.map((trail) => (
              <div key={trail.title}>
                <div className="flex items-center gap-1.5 px-2 text-[13px] font-medium">
                  <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                  {trail.title}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 pl-2.5">
                  {trail.items.map((item, i) => (
                    <li
                      key={item.title}
                      className={`flex items-center gap-2 rounded-md text-[13px] font-medium truncate px-2.5 py-[5px] ${
                        item.active
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span className="w-3 shrink-0 text-[10px] tabular-nums">{i + 1}</span>
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-1 flex items-center justify-between px-2 border-t border-border pt-2.5">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              Notes
            </h3>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <ul className="flex flex-col gap-0.5">
            {LOOSE_ITEMS.map((item) => (
              <li
                key={item.title}
                className="flex items-center gap-2 rounded-md text-[13px] font-medium truncate px-2.5 py-[5px] text-muted-foreground"
              >
                <span className="w-[7px] h-[7px] shrink-0 rounded-full box-border border-[1.5px] border-input" />
                <span className="truncate flex-1">{item.title}</span>
                {item.linked && <LinkIcon className="w-2.5 h-2.5 shrink-0 text-primary" />}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-1 flex-col min-w-0">
      <div className="h-12 flex items-center gap-3 px-5 shrink-0 bg-background">
        <PanelLeft className="lg:hidden w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate text-[13px] font-medium">Memex and Vannevar Bush</span>
        <span className="flex items-center gap-1 text-[11px] text-primary">
          <Check className="w-3 h-3" />Saved
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden xl:inline text-[11px] text-muted-foreground">123 words · 645 characters</span>
        <Download className="w-3.5 h-3.5 text-muted-foreground" />
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          <Share2 className="w-3 h-3" />
          Publish &amp; Share
        </span>
        <span className="w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center text-[11px] font-medium bg-primary text-primary-foreground">
          A
        </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-3 p-3">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background" data-mock-editor>
          <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-[24px] bg-muted px-3 py-2 shrink-0 text-muted-foreground" data-mock-toolbar>
            <Undo className="w-3.5 h-3.5" />
            <Redo className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <span className="flex items-center gap-1 text-[11px] shrink-0"><Type className="w-3.5 h-3.5" />Normal<ChevronDown className="w-3 h-3" /></span>
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <span className="flex items-center gap-1 text-[11px] font-medium shrink-0">
              Arial
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-medium shrink-0">
              <ChevronDown className="w-3 h-3" />
              15
              <ChevronUp className="w-3 h-3" />
            </span>
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <Baseline className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <AlignLeft className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <Bold className="w-3.5 h-3.5" />
            <Italic className="w-3.5 h-3.5" />
            <Underline className="w-3.5 h-3.5" />
            <Strikethrough className="w-3.5 h-3.5" />
            <Highlighter className="w-3.5 h-3.5" />
            <Code className="w-3.5 h-3.5" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <LinkIcon className="w-3.5 h-3.5" />
            <Plus className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3" />
            <span className="h-3.5 w-px shrink-0 bg-border" />
            <Search className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 overflow-hidden px-8 py-6">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-foreground">Step 3</p>
            <h1 className="font-display font-medium text-[28px] mb-2.5">
              Memex
            </h1>
            <p className="mb-5 text-[11px] text-muted-foreground">Used in 2 trails. Edits appear in both.</p>
            <p className="text-[13px] leading-6 mb-3 text-muted-foreground">
              Bush&apos;s Memex is a proposed personal library for books, records and communications.
              Introduced in{' '}
              <span className="text-primary font-medium">
                As We May Think
              </span>
              , it lets readers connect records and revisit those connections through{' '}
              <span className="text-primary font-medium">
                associative trails
              </span>
              .
            </p>
            <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
              <li>— Connect records by association</li>
              <li>— Reuse the same record in different trails</li>
              <li>— Share a path for others to explore</li>
            </ul>
          </div>
        </div>

        <div className="w-[204px] hidden lg:flex flex-col shrink-0 p-4 gap-3 overflow-hidden rounded-2xl border border-border bg-popover">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-[12px] font-medium">Connections (2)</h3>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden space-y-2">
            <p className="text-[10px] text-muted-foreground">Connections involving “Memex”.</p>
            {CONNECTIONS.map(title => <div key={title} className="space-y-1 rounded-lg border border-border p-2.5">
              <p className="text-[11px]">{title}</p>
              <p className="text-[9px] text-muted-foreground">@ mention in Memex</p>
            </div>)}
          </div>
          <div className="flex h-36 shrink-0 flex-col border-t border-border pt-2">
            <span className="mb-1 text-[11px] text-primary">Open map</span>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
              <svg viewBox="-64 -12 1260 620" role="img" aria-label="Two trails sharing the Memex note" className="h-full w-full">
                {GRAPH_TRAILS.map((trail, column) => <g key={trail.id} transform={`translate(${column * 570}, 0)`}>
                  <rect y="56" width="512" height="528" rx="6" fill="var(--muted)" fillOpacity="0.2" stroke="var(--border)" />
                  <text x="16" y="28" fill="var(--foreground)" fontSize="20">{trail.title}</text>
                </g>)}
                <g fill="none" stroke="var(--primary)" strokeWidth="1.5">
                  <path d="M16 494 C-44 494 -44 322 16 322" />
                  <path d="M1066 150 C1126 150 1126 322 1066 322" />
                  <path d="M496 494 C552 494 530 150 586 150" stroke="var(--ed-purple)" strokeDasharray="2 6" strokeLinecap="round" opacity="0.75" />
                </g>
                {GRAPH_TRAILS.map((trail, column) => trail.itemIds.map((id, row) => <g key={`${trail.id}:${id}`} transform={`translate(${column * 570 + 16}, ${84 + row * 172})`}>
                  <rect width="480" height="132" rx="6" fill="var(--card)" stroke={id === 'memex' && column === 0 ? 'var(--primary)' : 'var(--border)'} />
                  <text x="16" y="70" fill="var(--foreground)" fontSize="28">{GRAPH_ITEMS[id].title}</text>
                  <text x="464" y="28" fill="var(--muted-foreground)" fontSize="12" textAnchor="end">{id === 'memex' ? 'Shared · ' : ''}{row + 1}</text>
                </g>))}
              </svg>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-center gap-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" />Shortcuts</span>
            <span className="flex items-center gap-1"><CircleHelp className="w-3 h-3" />Help</span>
          </div>
        </div>
      </div>
        </div>
      </div>
      </div>
    </div>
  );
};
