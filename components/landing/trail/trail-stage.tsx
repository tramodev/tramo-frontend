// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowBigUp,
  Bell,
  Bold,
  Bookmark,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Check,
  ChevronDown,
  ChevronLeft,
  GitFork,
  Globe,
  Italic,
  Link as LinkIcon,
  Lock,
  PanelLeft,
  Plus,
  Redo,
  Search,
  Underline,
  Undo,
  UserPlus,
  X,
} from 'lucide-react';
import { Mark } from '@/components/layout/logo';
import { EASE } from '@/components/landing/landing-motion';
import {
  FORKED_PROJECT,
  NEIGHBORS,
  STAGE_URLS,
  TRAIL_ONE,
  TRAIL_TWO,
  YOUR_PROJECT,
  type MiniProject,
} from '@/components/landing/trail/trail-data';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring', duration: 0.75, bounce: 0.14 } as const;
const FADE = { duration: 0.45, ease: EASE } as const;

export function TrailStage({ step, still = false }: { step: number; still?: boolean }) {
  return (
    <div className={cn('@container flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-elevation-2', !still && 'h-full')}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        <span className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-input" />
          <span className="size-2.5 rounded-full bg-input" />
          <span className="size-2.5 rounded-full bg-input" />
        </span>
        <span className="mx-auto flex min-w-0 max-w-[75%] items-center gap-1.5 rounded-full bg-popover px-3 py-1 text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">{STAGE_URLS[step]}</span>
        </span>
      </div>
      {still ? (
        step === 6 ? <PublishView /> : step === 7 ? <ExploreView /> : <AppView step={step} still />
      ) : (
        <div className="relative min-h-0 flex-1">
          <AppView step={Math.min(step, 5)} />
          <Layer show={step >= 6}><PublishView /></Layer>
          <Layer show={step >= 7}><ExploreView /></Layer>
        </div>
      )}
    </div>
  );
}

function Layer({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 isolate bg-background shadow-elevation-2"
      initial={false}
      animate={{ x: show ? '0%' : '104%' }}
      transition={SPRING}
    >
      {children}
    </motion.div>
  );
}

function AppView({ step, still = false }: { step: number; still?: boolean }) {
  const trailOne = step === 0 ? ['Untitled'] : step === 1 ? ['Memex'] : ['Vannevar Bush', 'As We May Think', 'Memex'];
  const connections = step === 2 || step === 3;

  return (
    <div className="flex h-full">
      <div className="hidden w-[12.5rem] shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-card p-3 @[36rem]:flex">
        <div className="flex items-center gap-2">
          <Mark size={22} className="shrink-0" />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-input bg-popover px-2.5 py-1 text-xs text-muted-foreground">
            <Search className="size-3 shrink-0" />
            <span className="truncate">Search</span>
          </span>
        </div>
        <div className="flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
          Trails
          <Plus className="size-3.5" />
        </div>
        <SidebarTrail title={TRAIL_ONE} notes={trailOne} active={step === 0 ? 'Untitled' : 'Memex'} shared={step >= 3} still={still} />
        {step >= 3 && (
          <motion.div initial={still ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={FADE}>
            <SidebarTrail title={TRAIL_TWO} notes={['Memex', 'Associative trails', 'Sharing a trail']} shared still={still} />
          </motion.div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 px-3 @[36rem]:px-4">
          <PanelLeft className="size-3.5 shrink-0 text-muted-foreground @[36rem]:hidden" />
          <span className="min-w-0 truncate text-[0.8125rem] font-medium">{YOUR_PROJECT.title}</span>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground @[30rem]:flex">
            <Check className="size-3" />Saved
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {step === 5 && (
              <motion.span initial={still ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}>
                <Avatar letter="E" outline ring={EZEQUIEL} />
              </motion.span>
            )}
            <Pill icon={UserPlus} label="Share" />
            <Pill icon={Globe} label="Publish" />
            <Avatar letter="A" ring={step === 5 ? ANA : undefined} />
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 @[46rem]:flex-row">
          <div className="min-w-0 flex-1">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={step === 4 ? 'map' : 'note'}
                className="h-full"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={FADE}
              >
                {step === 4 ? <MapView /> : <NoteView step={step} still={still} />}
              </motion.div>
            </AnimatePresence>
          </div>
          {connections && <ConnectionsPanel step={step} still={still} />}
        </div>
      </div>
    </div>
  );
}

function SidebarTrail({ title, notes, active, shared, still }: { title: string; notes: string[]; active?: string; shared: boolean; still: boolean }) {
  return (
    <div>
      <div className="flex h-8 items-center gap-1.5 px-2 text-[0.8125rem] font-medium">
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{title}</span>
      </div>
      <ul className="relative flex flex-col gap-0.5 before:absolute before:inset-y-0 before:left-[1.0625rem] before:border-l before:border-sidebar-border">
        {notes.map((note, i) => (
          <motion.li
            key={note}
            initial={still ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={FADE}
            className={cn(
              'flex h-7 min-w-0 items-center gap-2 rounded-md pl-7 pr-2 text-[0.8125rem] font-medium text-muted-foreground',
              note === active && 'bg-sidebar-accent font-semibold text-foreground',
            )}
          >
            <span className="w-3 shrink-0 text-xs tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{note}</span>
            {shared && note === 'Memex' && <LinkIcon className="size-3 shrink-0" />}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

const ANA = 'var(--chart-1)';
const EZEQUIEL = 'var(--chart-5)';

function NoteView({ step, still }: { step: number; still: boolean }) {
  const mention = (label: string) => step >= 2
    ? <span className="font-medium text-[var(--ed-blue)] underline underline-offset-2">{label}</span>
    : label;
  const selection = step === 5
    ? <span className="rounded-[2px]" style={{ backgroundColor: `color-mix(in srgb, ${ANA} 24%, transparent)` }}>personal library</span>
    : 'personal library';

  return (
    <div className="h-full overflow-hidden px-2 pt-1 @[36rem]:px-5">
      <div className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-full bg-muted px-3.5 py-1.5 text-muted-foreground [&>svg]:size-3.5">
        <Undo /><Redo />
        <span className="h-3.5 w-px bg-border" />
        <Bold /><Italic /><Underline />
        <span className="h-3.5 w-px bg-border" />
        <LinkIcon /><Plus />
      </div>
      <AnimatePresence initial={false} mode="wait">
        {step === 0 ? (
          <motion.div key="empty" exit={{ opacity: 0 }} transition={FADE}>
            <p className="flex items-center font-display text-[1.75rem] font-medium leading-tight text-muted-foreground">
              <span className="mr-0.5 h-8 w-0.5 bg-foreground motion-safe:animate-pulse" />
              Untitled
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Start writing, or type @ to mention a note.</p>
          </motion.div>
        ) : (
          <motion.div
            key="memex"
            initial={still ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="font-display text-[1.75rem] font-medium leading-tight">
              Memex
              {step === 5 && <Cursor name="Ana" color={ANA} still={still} />}
            </p>
            {step >= 3 && (
              <motion.div initial={still ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={FADE} className="mt-2 text-xs text-muted-foreground">
                <p>Used in 2 trails. Edits appear in both.</p>
                <p className="mt-1 flex flex-wrap gap-x-3 underline underline-offset-2">
                  <span>{TRAIL_ONE}</span>
                  <span>{TRAIL_TWO}</span>
                </p>
              </motion.div>
            )}
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Bush’s Memex is a proposed {selection} for books, records and communications. Introduced in {mention('As We May Think')}, it lets readers connect records and revisit them through {mention('Associative trails')}.
            </p>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>Connect records by association</li>
              <li>Reuse the same record in different trails</li>
              <li>Share a path for others to explore</li>
              {step === 5 && (
                <li className="text-foreground">
                  Fork it and build on it
                  <Cursor name="Ezequiel" color={EZEQUIEL} still={still} />
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Cursor({ name, color, still }: { name: string; color: string; still: boolean }) {
  return (
    <motion.span
      initial={still ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="ml-0.5 inline-flex items-center gap-1 align-middle"
    >
      <span className="inline-block h-[1.2em] w-0.5" style={{ backgroundColor: color }} />
      <span className="rounded-sm px-1.5 py-0.5 font-sans text-xs font-semibold leading-4 text-[var(--collab-cursor-foreground)]" style={{ backgroundColor: color }}>
        {name}
      </span>
    </motion.span>
  );
}

function ConnectionsPanel({ step, still }: { step: number; still: boolean }) {
  return (
    <motion.div
      initial={still ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING}
      className="flex shrink-0 flex-col gap-2.5 rounded-lg border border-border bg-popover p-3.5 @[46rem]:w-[12.5rem]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] font-medium">Connections (2)</p>
        <X className="size-3.5 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground @[30rem]:hidden @[46rem]:block">Connections involving “Memex”.</p>
      <div className="grid flex-1 gap-2.5 @[30rem]:grid-cols-2 @[46rem]:flex @[46rem]:flex-col">
        <div className="flex flex-col gap-2.5">
          {['As We May Think', 'Associative trails'].map(title => (
            <div key={title} className="rounded-md border border-border p-2.5">
              <p className="text-[0.8125rem]">Memex — {title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">@ mention in Memex</p>
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col border-t border-border pt-2 @[30rem]:mt-0 @[30rem]:border-t-0 @[30rem]:pt-0 @[46rem]:mt-auto @[46rem]:border-t @[46rem]:pt-2">
          <span className="mb-1 text-xs text-primary">Open map</span>
          <MiniMap lanes={step >= 3 ? 2 : 1} still={still} />
        </div>
      </div>
    </motion.div>
  );
}

function MiniMap({ lanes, still }: { lanes: number; still: boolean }) {
  return (
    <div
      className="relative flex h-28 gap-2 overflow-hidden rounded-lg border border-border bg-popover p-1.5"
      style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 0)', backgroundSize: '10px 10px' }}
    >
      {LANES.slice(0, lanes).map((lane, l) => (
        <motion.div
          key={lane.title}
          initial={still || l === 0 ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRING}
          className="grid min-w-0 flex-1 grid-rows-3 gap-1.5 rounded-[2px] border border-border bg-muted/20 p-1"
        >
          {lane.cards.map(card => (
            <div key={card.title} className={cn('flex flex-col justify-center gap-1 rounded-[2px] border bg-card px-1.5', lanes === 2 && card.shared ? 'border-[var(--ed-purple)]' : 'border-border')}>
              <span className="h-1 w-3/5 rounded-full bg-foreground/60" />
              <span className="h-0.5 w-4/5 rounded-full bg-muted-foreground/40" />
            </div>
          ))}
        </motion.div>
      ))}
      {lanes === 1 && <div className="flex-1" />}
    </div>
  );
}

const LANES = [
  {
    title: TRAIL_ONE,
    cards: [
      { title: 'Vannevar Bush', preview: 'An American engineer and science administrator. In 1945 he published As We May Think.' },
      { title: 'As We May Think', preview: 'Published in The Atlantic in July 1945, it asks how tools could help people connect records.' },
      { title: 'Memex', preview: 'A proposed device for storing and consulting a person’s books, records and communications.', shared: true },
    ],
    links: [true, true],
  },
  {
    title: TRAIL_TWO,
    cards: [
      { title: 'Memex', preview: 'A proposed device for storing and consulting a person’s books, records and communications.', shared: true },
      { title: 'Associative trails', preview: 'A named path through connected records that a reader can return to.' },
      { title: 'Sharing a trail', preview: 'Bush imagined readers copying trails for other people to explore and extend.' },
    ],
    links: [true, false],
  },
];

function MapView() {
  return (
    <div
      className="flex h-full min-h-[22rem] flex-col gap-2 overflow-hidden rounded-lg bg-popover p-3"
      style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 0)', backgroundSize: '22px 22px' }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] font-display text-[0.9375rem] font-medium @[36rem]:text-base">
        <p className="truncate px-1">{LANES[0].title}</p>
        <span />
        <p className="truncate px-1">{LANES[1].title}</p>
      </div>
      <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)]">
        <Lane lane={LANES[0]} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="-mx-2 h-full w-[calc(100%+1rem)] overflow-visible">
          <path d="M0,83 H50 V17 H100" fill="none" stroke="var(--ed-purple)" strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <Lane lane={LANES[1]} />
      </div>
    </div>
  );
}

function Lane({ lane }: { lane: typeof LANES[number] }) {
  return (
    <div className="grid grid-rows-3 gap-4 rounded-md border border-border bg-muted/20 p-2">
      {lane.cards.map((card, i) => (
        <div key={card.title} className="relative flex min-h-0 flex-col justify-center rounded-md border border-border bg-card px-2.5 py-2">
          {i > 0 && lane.links[i - 1] && (
            <svg viewBox="0 0 10 18" className="absolute left-1/2 top-0 h-[18px] w-2.5 -translate-y-full" aria-hidden="true">
              <path d="M2,1 C10,5 10,13 2,17" fill="none" stroke="var(--primary)" strokeWidth={1.25} opacity={0.7} />
            </svg>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <p className="min-w-0 font-display text-[0.9375rem] font-medium leading-tight @[36rem]:text-base">{card.title}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.shared && 'Shared '}{i + 1}</p>
          </div>
          <p className="mt-1 hidden text-xs leading-snug text-muted-foreground @[36rem]:line-clamp-2">{card.preview}</p>
        </div>
      ))}
    </div>
  );
}

function PublishView() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
        <Mark size={22} className="shrink-0" />
        <span className="h-4 w-px bg-border" />
        <span className="flex items-center gap-0.5 text-[0.8125rem] text-muted-foreground"><ChevronLeft className="size-4" />Editor</span>
        <span className="text-[0.9375rem] font-semibold">Publish</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col @[30rem]:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden bg-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[.04em] text-muted-foreground">Explore preview</p>
          <div className="opacity-40"><MiniCard project={NEIGHBORS[0]} /></div>
          <div className="relative mt-1 rounded-[14px] ring-2 ring-foreground">
            <span className="absolute -top-2.5 left-3 z-10 rounded-full bg-foreground px-2 text-xs font-medium uppercase leading-5 text-background">Your project</span>
            <MiniCard project={YOUR_PROJECT} />
          </div>
          <div className="opacity-40"><MiniCard project={NEIGHBORS[1]} /></div>
        </div>
        <div className="flex shrink-0 flex-col gap-4 border-t border-border p-4 @[30rem]:w-[13.5rem] @[30rem]:border-l @[30rem]:border-t-0 @[40rem]:w-[15.5rem]">
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.8125rem] font-medium">Visibility</p>
            <Visibility icon={Lock} label="Private" description="Only you and people you share it with" />
            <Visibility icon={Globe} label="Published" description="Listed on Explore for everyone" active />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.8125rem] font-medium">Description</p>
            <p className="rounded-xs border border-input px-3 py-2 text-xs leading-5">{YOUR_PROJECT.description}</p>
            <p className="text-xs text-muted-foreground">{YOUR_PROJECT.description.length}/255 characters</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.8125rem] font-medium">Tags</p>
            <p className="rounded-md border border-input px-3 py-1.5 text-xs">{YOUR_PROJECT.tags.join(', ')}</p>
            <Tags tags={YOUR_PROJECT.tags} />
          </div>
          <span className="mt-auto flex h-9 items-center justify-center self-end rounded-full bg-foreground px-5 text-[0.8125rem] font-medium text-background shadow-elevation-2">Publish</span>
        </div>
      </div>
    </div>
  );
}

function Visibility({ icon: Icon, label, description, active = false }: { icon: typeof Lock; label: string; description: string; active?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-md border px-3 py-2', active ? 'border-foreground bg-foreground/5' : 'border-border')}>
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {active && <Check className="size-3.5 shrink-0" />}
    </div>
  );
}

function ExploreView() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="mr-auto flex items-center gap-1.5">
          <Mark size={22} className="shrink-0" />
          <span className="hidden font-display text-[0.9375rem] font-medium @[30rem]:inline">Tramo</span>
        </span>
        <span className="flex h-7 items-center rounded-full px-3 text-xs font-medium text-muted-foreground">My Projects</span>
        <span className="flex h-7 items-center rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground">Explore</span>
        <Bell className="mx-1 size-3.5 shrink-0 text-muted-foreground" />
        <Avatar letter="A" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 @[40rem]:px-6">
        <div className="flex flex-col gap-3 @[40rem]:flex-row @[40rem]:items-end @[40rem]:justify-between">
          <div>
            <p className="text-xs font-medium text-primary">The commons</p>
            <p className="font-display text-[1.75rem] leading-tight">Explore</p>
          </div>
          <div className="flex flex-col gap-2 @[30rem]:flex-row @[30rem]:items-center">
            <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-high px-3 text-xs text-muted-foreground @[30rem]:w-48">
              <Search className="size-3.5 shrink-0" />Search published projects
            </span>
            <span className="grid h-8 grid-cols-3 overflow-hidden rounded-full border border-input text-xs font-medium">
              {['Recent', 'Hot', 'Following'].map((sort, i) => (
                <span key={sort} className={cn('flex items-center justify-center border-l border-input px-3 first:border-l-0', i === 0 ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground')}>{sort}</span>
              ))}
            </span>
          </div>
        </div>
        <Featured project={YOUR_PROJECT} />
        <div className="flex min-h-0 gap-7">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground">Recently published</p>
            <MiniCard project={FORKED_PROJECT} actions />
            <MiniCard project={NEIGHBORS[0]} actions />
          </div>
          <div className="hidden w-[9.5rem] shrink-0 flex-col gap-3 pt-7 @[44rem]:flex">
            <div className="rounded-xl bg-card p-3">
              <p className="text-[0.8125rem] font-semibold">Popular topics</p>
              <div className="mt-2"><Tags tags={['history', 'knowledge', 'music', 'plants']} /></div>
            </div>
            <div className="rounded-xl bg-card p-3">
              <p className="text-[0.8125rem] font-semibold">Trending projects</p>
              {NEIGHBORS.map(project => (
                <div key={project.title} className="mt-2">
                  <p className="line-clamp-2 text-xs font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground">{project.owner}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Featured({ project }: { project: MiniProject }) {
  return (
    <div className="grid shrink-0 items-center gap-4 rounded-xl bg-card p-4 @[40rem]:grid-cols-[minmax(0,1fr)_10rem] @[40rem]:p-5">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium text-primary">Featured today</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar letter={project.owner[0].toUpperCase()} outline />
          <span className="font-medium text-foreground">{project.owner}</span>
          <span className="truncate">Published {project.date}</span>
        </div>
        <p className="mt-2 font-display text-xl leading-tight">{project.title}</p>
        <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">{project.description}</p>
        <div className="mt-2"><Tags tags={project.tags} /></div>
        <Actions project={project} />
      </div>
      {project.thumbnail && (
        <div className="relative hidden h-32 overflow-hidden rounded-[20px] bg-accent @[40rem]:block">
          <Image src={project.thumbnail} alt="" fill sizes="160px" className="object-cover" />
        </div>
      )}
    </div>
  );
}

function Actions({ project }: { project: MiniProject }) {
  if (!project.stats) return null;
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground [&_svg]:size-3.5">
      <span className="flex items-center gap-1 font-medium text-foreground"><ArrowBigUp />{project.stats.votes}</span>
      <Repeat2 />
      <span className="flex items-center gap-1"><Eye />{project.stats.views}</span>
      <span className="flex items-center gap-1"><MessageCircle />{project.stats.comments}</span>
      <span className="ml-auto flex items-center gap-3"><Bookmark /><MoreHorizontal /></span>
    </div>
  );
}

function MiniCard({ project, actions = false }: { project: MiniProject; actions?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-popover p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar letter={project.owner[0].toUpperCase()} outline />
          <span className="font-medium text-foreground">{project.owner}</span>
          <span className="truncate">Published {project.date}</span>
        </div>
        {project.forkedFrom && (
          <span className="mt-2 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium">
            <GitFork className="size-3 shrink-0" />
            <span className="truncate">Forked from {project.forkedFrom.owner} / {project.forkedFrom.title}</span>
          </span>
        )}
        <p className="mt-1.5 font-display text-[0.9375rem] font-medium leading-snug">{project.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">{project.description}</p>
        <div className="mt-2"><Tags tags={project.tags} /></div>
        {actions && <Actions project={project} />}
      </div>
      <div className="relative hidden h-[4.5rem] w-[5.5rem] shrink-0 self-center overflow-hidden rounded-md bg-surface-container-high @[34rem]:block">
        {project.thumbnail
          ? <Image src={project.thumbnail} alt="" fill sizes="88px" className="object-cover" />
          : <span className="flex size-full items-center justify-center font-display text-3xl font-medium text-muted-foreground">{project.title[0]}</span>}
      </div>
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => <span key={tag} className="rounded-sm border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">{tag}</span>)}
    </div>
  );
}

function Avatar({ letter, outline = false, ring }: { letter: string; outline?: boolean; ring?: string }) {
  return (
    <span className={cn(
      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-2 ring-background',
      outline ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
    )} style={ring ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${ring}` } : undefined}>
      {letter}
    </span>
  );
}

function Pill({ icon: Icon, label }: { icon: typeof Globe; label: string }) {
  return (
    <span className="flex h-7 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground">
      <Icon className="size-3" />
      <span className="hidden @[30rem]:inline">{label}</span>
    </span>
  );
}
