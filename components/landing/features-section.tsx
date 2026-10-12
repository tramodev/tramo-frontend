// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Image from 'next/image';
import { Check, Link2, Waypoints, X, ChevronDown, Plus } from 'lucide-react';
import { FadeUp } from '@/components/landing/landing-motion';

function ConnectionsPanelMockup() {
  return <div className="w-full rounded-[18px] border border-border bg-popover p-5 shadow-elevation-2">
    <div className="mb-4 flex items-center justify-between gap-2">
      <span className="font-display text-lg font-medium">Connections (1)</span>
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
    <p className="mb-4 text-xs text-muted-foreground">Connections involving “Vannevar Bush”.</p>
    <div className="rounded-xl border border-border p-4">
      <p className="text-[13px] font-medium">Vannevar Bush — As We May Think</p>
      <p className="mt-1 text-xs text-muted-foreground">@ mention in Vannevar Bush</p>
    </div>
    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-primary"><Waypoints className="h-3.5 w-3.5" />Open map</div>
  </div>;
}

function ConnectionsMockup() {
  return <div className="w-full rounded-[20px] border border-border bg-background shadow-elevation-2">
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
      <span className="font-medium">Memex and Vannevar Bush</span>
      <span className="flex shrink-0 items-center gap-1 text-primary"><Check className="h-3 w-3" />Saved</span>
    </div>
    <div className="px-6 pb-32 pt-6 sm:px-9">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Step 1</p>
      <p className="mb-3 font-display text-2xl font-medium">Vannevar Bush</p>
      <div className="max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Vannevar Bush was an American engineer and science administrator. In 1945, he published{' '}
        <span className="relative inline-block">
          <span className="text-primary">@As We May Think</span>
          <span className="ml-0.5 inline-block h-3.5 w-px bg-primary align-middle" />
          <span className="absolute left-0 top-full mt-2 block w-[200px] rounded-lg border border-border bg-popover p-1 shadow-elevation-2">
            <span className="block rounded-sm bg-secondary px-2.5 py-1.5 text-[13px] text-secondary-foreground">As We May Think</span>
          </span>
        </span>
      </div>
    </div>
  </div>;
}

function ReuseMockup() {
  return <div className="w-full rounded-[18px] border border-border bg-card p-3 shadow-elevation-2">
    <div className="mb-3 flex items-center justify-between px-2 text-[11px] font-medium text-muted-foreground"><span>Trails</span><Plus className="h-3.5 w-3.5" /></div>
    {[
      { title: 'Bush’s vision', notes: ['Vannevar Bush', 'As We May Think', 'Memex'] },
      { title: 'Thinking in trails', notes: ['Memex', 'Associative trails', 'Sharing a trail'] },
    ].map(trail => <div key={trail.title} className="mb-3 last:mb-0">
      <p className="mb-1 flex items-center gap-1.5 px-2 text-[13px] font-medium"><ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />{trail.title}</p>
      <ol className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">{trail.notes.map((note, index) => <li key={note} className="flex items-center gap-2 rounded-md px-2.5 py-[5px] text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" style={note === 'Memex' && trail.title === 'Bush’s vision' ? {
        backgroundColor: 'color-mix(in srgb, var(--primary) 15%, var(--sidebar))',
        color: 'var(--foreground)',
        fontWeight: 600,
        outline: '1px solid color-mix(in srgb, var(--primary) 35%, transparent)',
        outlineOffset: -1,
      } : undefined}>
        <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate">{note}</span>{note === 'Memex' && <Link2 aria-label="Used in 2 trails" className="h-3 w-3 shrink-0 text-primary" />}
      </li>)}</ol>
    </div>)}
    <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Used in 2 trails. Edits appear in both.</p>
  </div>;
}

function MapMockup() {
  return <>
    <Image
      src="/landing-map-light.png"
      alt="Two trails connected through the shared Memex note"
      width={1724}
      height={1282}
      sizes="(max-width: 768px) 100vw, 464px"
      className="h-auto w-full rounded-[18px] border border-border shadow-elevation-2 dark:hidden"
    />
    <Image
      src="/landing-map-dark.png"
      alt="Two trails connected through the shared Memex note"
      width={1392}
      height={1056}
      sizes="(max-width: 768px) 100vw, 464px"
      className="hidden h-auto w-full rounded-[18px] border border-border shadow-elevation-2 dark:block"
    />
  </>;
}

const STEPS = [
  { Mockup: ConnectionsMockup, color: '--ed-orange', label: 'Connect them', title: 'Explain how ideas relate', description: 'Connect notes when a relationship adds context. Choose a destination and add an optional explanation.' },
  { Mockup: ConnectionsPanelMockup, color: '--ed-blue', label: 'Connections', title: 'See how your notes connect', description: 'Review connections involving a note and follow them to related ideas.' },
  { Mockup: ReuseMockup, color: '--ed-purple', label: 'Reuse them', title: 'One note, more than one trail', description: 'A trail is an ordered sequence of notes. Use the same note in different trails, in a different reading order.' },
  { Mockup: MapMockup, color: '--ed-green', label: 'Explore the map', title: 'See the bigger picture', description: 'View your trails side by side. See how notes connect and where the same idea appears in different paths.' },
];

export function FeaturesSection() {
  return <section id="product" className="pt-16 pb-[84px]">
    <div className="mb-4 text-sm font-medium text-primary">From a note to a clear explanation</div>
    <h2 className="mb-3.5 max-w-[24ch] font-display text-[40px] font-medium leading-[1.1]">Write once. Explain in different ways.</h2>
    <p className="mb-10 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">Keep your notes connected and reusable. Build trails for the things you want to learn or explain.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {STEPS.map(({ Mockup, color, label, title, description }, index) => <FadeUp key={label} delay={index * 0.08} className="h-full md:row-span-2 md:grid md:grid-rows-subgrid">
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-card md:row-span-2 md:grid md:grid-rows-subgrid md:gap-0">
          <div className="p-6 sm:p-9">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: `var(${color})` }}>{label}</div>
            <h3 className="mb-3 font-display text-2xl font-medium">{title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div aria-hidden="true" className="flex flex-1 items-center p-5 sm:p-9" style={{ background: `var(${color})` }}><Mockup /></div>
        </div>
      </FadeUp>)}
    </div>
  </section>;
}
