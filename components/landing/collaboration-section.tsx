'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronRight, PenLine, UserPlus, Users } from 'lucide-react';
import { AuthorAvatar } from '@/components/shared/author-avatar';
import { FadeUp } from '@/components/landing/landing-motion';
import { cn } from '@/lib/utils';
import productBg2 from '@/public/product-bg-2.webp';

const PEOPLE = [
  { name: 'Ezequiel', color: 'var(--chart-2)', role: 'Owner' },
  { name: 'Ana', color: 'var(--chart-1)', role: 'Can edit' },
  { name: 'Mara', color: 'var(--chart-3)', role: 'Can view' },
];

function Caret({ name, color }: { name: string; color: string }) {
  return <span className="relative inline-block h-[1.15em] w-px align-text-bottom" style={{ backgroundColor: color }}>
    <span className="absolute bottom-full left-[-2px] mb-0.5 whitespace-nowrap rounded-xs px-1 py-px text-[0.6875rem] font-semibold leading-tight text-background" style={{ backgroundColor: color }}>{name}</span>
  </span>;
}

function NoteMock() {
  const [ezequiel, ana] = PEOPLE;
  return <div className="p-6 sm:p-8">
    <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">Step 2</p>
    <p className="mb-4 font-display text-2xl font-medium">How the Memex links ideas</p>
    <p className="mb-3 text-[0.9375rem] leading-[1.9]">
      Bush imagined a desk that stores every book and letter, so a reader can <span style={{ backgroundColor: `color-mix(in srgb, ${ana.color} 30%, transparent)` }}>tie two items together</span><Caret {...ana} /> and come back to them later.
    </p>
    <p className="text-[0.9375rem] leading-[1.9]">
      Those links form a trail that someone else can follow step by step<Caret {...ezequiel} />
    </p>
  </div>;
}

function ShareMock() {
  return <div className="p-6 sm:p-8">
    <p className="border-b border-border pb-4 text-[1.0625rem] font-semibold">Share project</p>
    <p className="my-4 rounded-md border border-input px-3 py-2 text-[0.8125rem] text-muted-foreground">Add people by username</p>
    {PEOPLE.map(({ name, role }) => <div key={name} className="flex min-h-14 items-center gap-3 border-t border-border text-[0.8125rem]">
      <AuthorAvatar username={name} avatar={null} size={32} />
      <span className="min-w-0 flex-1 truncate">@{name.toLowerCase()}</span>
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">{role}{role !== 'Owner' && <ChevronDown className="h-3 w-3" />}</span>
    </div>)}
  </div>;
}

function PresenceMock() {
  const notes: [string, typeof PEOPLE][] = [
    ['Desk of the future', [PEOPLE[2]]],
    ['How the Memex links ideas', [PEOPLE[0], PEOPLE[1]]],
    ['Trails you can share', []],
    ['Reading someone else’s trail', []],
  ];
  return <div className="p-6 sm:p-8">
    <div className="mb-5 flex items-center gap-2 border-b border-border pb-4">
      <div className="flex -space-x-0.5">
        {PEOPLE.map(({ name, color }) => <span key={name} className="flex rounded-full ring-2 ring-background">
          <span className="relative flex rounded-full">
            <AuthorAvatar username={name} avatar={null} size={28} />
            <span className="absolute -inset-0.5 rounded-full border-2" style={{ borderColor: color }} />
          </span>
        </span>)}
      </div>
      <span className="text-[0.8125rem] font-medium text-muted-foreground">3 editing</span>
    </div>
    <p className="mb-1 flex items-center gap-1 text-[0.875rem] font-medium"><ChevronRight className="h-3.5 w-3.5 rotate-90" />The Memex</p>
    {notes.map(([title, here], index) => <p key={title} className="flex items-center gap-2 py-1.5 pl-1 text-[0.875rem]">
      <span className="w-4 shrink-0 text-right text-[0.625rem] tabular-nums text-muted-foreground">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {here.map(({ name, color }) => <span key={name} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />)}
    </p>)}
  </div>;
}

const FEATURES = [
  { icon: PenLine, lead: 'Real-time editing.', rest: 'See changes as they happen, no refresh, no conflicts.', mock: NoteMock },
  { icon: UserPlus, lead: 'Invite with a link or username.', rest: 'Choose who can view and who can edit.', mock: ShareMock },
  { icon: Users, lead: 'See who’s here.', rest: 'Avatars show who is in the project and which note they’re on.', mock: PresenceMock },
];

export function CollaborationSection() {
  const [active, setActive] = useState(0);
  const Mock = FEATURES[active].mock;
  return <section id="collaboration" className="scroll-mt-20 grid items-center gap-10 pt-16 pb-[84px] lg:grid-cols-2 lg:gap-16">
    <div>
      <h2 className="mb-4 font-display text-[2.5rem] font-medium leading-[1.1] sm:text-[3rem]">Write together.</h2>
      <p className="mb-8 max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted-foreground">
        Invite people to your project and build trails side by side. <Link href="/wiki/collaboration" className="font-medium text-primary underline-offset-4 hover:underline">Learn more.</Link>
      </p>
      <div className="-mx-4 flex flex-col gap-1">
        {FEATURES.map(({ icon: Icon, lead, rest }, index) => <button key={lead} type="button" aria-pressed={active === index}
          onClick={() => setActive(index)} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}
          className={cn('flex gap-3 rounded-lg p-4 text-left text-[0.9375rem] leading-relaxed text-muted-foreground transition-colors', active === index ? 'bg-muted' : 'hover:bg-muted/50')}>
          <Icon className="mt-1 h-4 w-4 shrink-0 text-primary" />
          <span><strong className="font-medium text-foreground">{lead}</strong> {rest}</span>
        </button>)}
      </div>
    </div>
    <FadeUp>
      <div aria-hidden="true" inert className="relative isolate h-[26rem] overflow-hidden rounded-[28px] sm:h-[32rem]">
        <Image src={productBg2} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="-z-10 object-cover" />
        <div className="absolute bottom-0 left-8 right-0 top-8 overflow-hidden rounded-tl-xl border-l border-t border-border bg-background sm:left-12 sm:top-12">
          <Mock />
        </div>
      </div>
    </FadeUp>
  </section>;
}
