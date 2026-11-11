// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { ArrowRight, Check, Flag } from 'lucide-react';
import { FadeUp } from '@/components/landing/landing-motion';
import { TRAILS } from '@/components/landing/trail/trail-data';

export function TrailEnd() {
  return (
    <FadeUp className="mb-20 mt-24 md:mb-24">
      <section aria-labelledby="end-title" className="grid gap-12 rounded-xl bg-primary p-7 text-primary-foreground sm:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 lg:p-14">
        <div className="flex flex-col items-start">
          <p className="flex items-center gap-2 font-mono text-sm text-primary-foreground/75">
            <Flag aria-hidden="true" className="size-4" />End of trail
          </p>
          <h2 id="end-title" className="landing-display mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.02]">
            <span className="block">Learn it.</span> <span className="block">Explain it.</span> <span className="block">One trail at a time.</span>
          </h2>
          <p className="mt-5 text-lg text-primary-foreground/75">Free, open source, no card required.</p>
          <a
            href="/signup"
            className="group mt-10 inline-flex h-13 items-center gap-2 rounded-full bg-primary-foreground px-7 text-base font-medium text-primary transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
          >
            Start your first trail
            <ArrowRight aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
          </a>
        </div>
        <div>
          <p className="text-sm font-medium text-primary-foreground/75">You followed 2 trails</p>
          {TRAILS.map(trail => (
            <div key={trail.id} className="mt-4">
              <p className="font-display text-lg font-medium">{trail.title}</p>
              <ol className="mt-2 divide-y divide-primary-foreground/15 border-y border-primary-foreground/15">
                {trail.steps.map((title, i) => (
                  <li key={title} className="flex items-center gap-4 py-2.5 text-[0.9375rem]">
                    <span className="w-6 shrink-0 font-mono text-sm text-primary-foreground/75">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">{title}</span>
                    <Check aria-hidden="true" className="size-4 shrink-0" />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </FadeUp>
  );
}
