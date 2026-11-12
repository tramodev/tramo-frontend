// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll } from 'motion/react';
import { ArrowDown, ArrowRight, Flag } from 'lucide-react';
import { TrailStage } from '@/components/landing/trail/trail-stage';
import { useMounted } from '@/hooks/use-mounted';
import { NOTES, TRAILS } from '@/components/landing/trail/trail-data';
import { cn } from '@/lib/utils';

const DOT = 'absolute -left-12 flex size-8 items-center justify-center rounded-full border font-mono text-xs font-medium transition-colors duration-300 md:-left-[4.5rem]';
const FILLED = 'border-foreground bg-foreground text-background';
const EMPTY = 'border-border bg-background text-muted-foreground';
const [MAIN, SECOND] = TRAILS;

function goTo(event: React.MouseEvent<HTMLAnchorElement>, id: string, block: ScrollLogicalPosition) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const card = target.querySelector<HTMLElement>('article') ?? target;
  card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block });
  card.focus({ preventScroll: true });
}

function useReached() {
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [reached, setReached] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const middle = window.innerHeight / 2 + 1;
        setReached(cards.current.filter(card => {
          if (!card) return false;
          const { top, height } = card.getBoundingClientRect();
          return top + height / 2 <= middle;
        }).length);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return { cards, reached };
}

function Rail({ className }: { className?: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: rail, offset: ['start center', 'end center'] });
  return (
    <div ref={rail} aria-hidden="true" className={cn('absolute bottom-6 left-[calc(1rem-1px)] w-0.5 bg-border md:left-[calc(1.5rem-1px)]', className)}>
      <motion.div style={{ scaleY: scrollYProgress }} className="h-full origin-top bg-foreground" />
    </div>
  );
}

function TrailHeader({ id, label, title, children }: { id: string; label: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className={cn(DOT, 'top-0', FILLED)}>0</span>
      <p className="flex h-8 items-center font-mono text-sm text-muted-foreground">{label}</p>
      <h2 id={id} className="landing-display mt-4 max-w-[18ch] font-display text-[clamp(2.25rem,4.6vw,4rem)] font-medium leading-[1.04]">{title}</h2>
      <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{children}</p>
    </>
  );
}

function TrailComplete({ done, total }: { done: boolean; total: number }) {
  return (
    <div className="relative mt-6 flex min-h-12 items-center">
      <span aria-hidden="true" className={cn(DOT, 'top-1/2 -translate-y-1/2', done ? FILLED : EMPTY)}>
        <Flag className="size-3.5" />
      </span>
      <p className="text-sm font-medium">Trail complete · {total} of {total} steps</p>
    </div>
  );
}

function stepLabel(n: number, total: number) {
  return `Step ${String(n).padStart(2, '0')} of ${String(total).padStart(2, '0')}`;
}

export function TrailJourney() {
  const { cards, reached: step } = useReached();
  const reduceMotion = useReducedMotion();
  const mounted = useMounted();

  return (
    <section id={MAIN.id} aria-labelledby="trail-title" className="relative scroll-mt-20 pl-12 md:pl-20">
      <Rail className="top-4" />

      <div className="relative pb-12 lg:pb-4">
        <TrailHeader id="trail-title" label={`${MAIN.title} · ${NOTES.length} steps`} title="Now build it, one note at a time.">
          Every project starts the same way: an empty editor. Each step below adds one piece, and the app builds along with you.
        </TrailHeader>
        <div aria-hidden="true" inert className="mt-8 lg:hidden">
          <TrailStage step={0} still />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] lg:gap-12">
        <ol>
          {NOTES.map((note, i) => {
            const n = i + 1;
            const last = n === NOTES.length;
            const next = last ? SECOND.id : NOTES[n].id;
            return (
              <li key={note.id} id={note.id} className="flex scroll-mt-24 flex-col py-6 lg:min-h-[80svh] lg:justify-center">
                <div className="relative">
                  <span aria-hidden="true" className={cn(DOT, 'top-1/2 -translate-y-1/2', step >= n ? FILLED : EMPTY)}>{n}</span>
                  <article
                    ref={element => { cards.current[i] = element; }}
                    tabIndex={-1}
                    aria-labelledby={`${note.id}-title`}
                    className={cn('rounded-xl border bg-card p-6 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring md:p-8', step === n ? 'border-foreground' : 'border-transparent')}
                  >
                    <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{stepLabel(n, NOTES.length)}</p>
                    <h3 id={`${note.id}-title`} className="mt-3 text-balance font-display text-2xl font-medium leading-tight md:text-[1.75rem]">{note.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">{note.body}</p>
                    {last ? (
                      <a
                        href={`#${next}`}
                        onClick={event => goTo(event, next, 'start')}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        Next trail: {SECOND.title}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </a>
                    ) : (
                      <a
                        href={`#${next}`}
                        onClick={event => goTo(event, next, 'center')}
                        className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        Next step
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </a>
                    )}
                  </article>
                </div>
                <div aria-hidden="true" inert className="mt-4 lg:hidden">
                  <TrailStage step={n} still />
                </div>
              </li>
            );
          })}
        </ol>

        <div aria-hidden="true" inert className="hidden lg:block">
          <div className="sticky top-[max(5.5rem,calc(50svh-21.25rem))]">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="font-mono text-sm text-muted-foreground">{step === 0 ? 'Empty note · start' : `Step ${step} of ${NOTES.length}`}</span>
              <span className="flex gap-1">
                {NOTES.map((note, i) => <span key={note.id} className={cn('h-1 w-5 rounded-full transition-colors duration-300', step > i ? 'bg-foreground' : 'bg-border')} />)}
              </span>
            </div>
            <div className="h-[min(40rem,calc(100svh-9rem))]">
              <TrailStage step={step} still={mounted && reduceMotion === true} className="h-full" />
            </div>
          </div>
        </div>
      </div>

      <TrailComplete done={step >= NOTES.length} total={NOTES.length} />
    </section>
  );
}

export function FreeAndOpenTrail({ steps }: { steps: React.ReactNode[] }) {
  const { cards, reached } = useReached();

  return (
    <section id={SECOND.id} tabIndex={-1} aria-labelledby="free-and-open-title" className="relative scroll-mt-20 pl-12 pt-24 outline-none md:pl-20">
      <Rail className="top-28" />
      <div className="relative pb-6">
        <TrailHeader id="free-and-open-title" label={`${SECOND.title} · ${steps.length} steps`} title="Who makes it, and what it costs.">
          Tramo is built in the open by one person, and the core is free for everyone.
        </TrailHeader>
      </div>
      <ol>
        {steps.map((content, i) => (
          <li key={SECOND.steps[i]} ref={element => { cards.current[i] = element; }} className="relative py-10">
            <span aria-hidden="true" className={cn(DOT, 'top-10', reached > i ? FILLED : EMPTY)}>{i + 1}</span>
            <p className="mb-6 flex h-8 items-center font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {stepLabel(i + 1, steps.length)} · {SECOND.steps[i]}
            </p>
            {content}
          </li>
        ))}
      </ol>
      <TrailComplete done={reached >= steps.length} total={steps.length} />
    </section>
  );
}
