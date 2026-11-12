// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Image from 'next/image';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { BrowserMockup } from '@/components/landing/browser-mockup';
import { MockGuard } from '@/components/landing/mock-guard';
import { FadeUp, StaggerGroup, StaggerItem } from '@/components/landing/landing-motion';
import { Button } from '@/components/ui/button';
import heroBg from '@/public/hero-bg.webp';

export function TrailHero() {
  return (
    <section aria-labelledby="hero-title" className="pt-14 md:pt-20">
      <StaggerGroup>
        <StaggerItem>
          <h1 id="hero-title" className="landing-display font-display font-normal leading-[1.02] text-[clamp(2.5rem,5vw,3.75rem)]">
            <span className="block">Turn connected, reusable notes</span>{' '}
            <span className="block">into <strong className="font-bold">trails</strong> for learning and explaining.</span>
          </h1>
        </StaggerItem>
        <StaggerItem>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[38ch] text-lg leading-relaxed text-muted-foreground md:text-xl">
              Write a note once, reuse it across trails, and share a clear path through any topic.
            </p>
            <div className="flex flex-col items-stretch gap-3 sm:items-start md:items-end">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="xl" className="group h-13 px-7 text-base shadow-none hover:shadow-none active:scale-[0.98] has-[>svg]:px-7">
                  <a href="/signup">Start your first trail<ArrowRight aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" /></a>
                </Button>
                <Button asChild size="xl" variant="outline" className="h-13 px-7 text-base shadow-none hover:shadow-none active:scale-[0.98]">
                  <a href="/explore">Explore trails</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Explore is open to everyone. No account needed.</p>
            </div>
          </div>
        </StaggerItem>
      </StaggerGroup>
      <FadeUp scaleIn className="pb-20 pt-12 md:pb-24 md:pt-16">
        <div className="relative overflow-hidden rounded-xl bg-muted p-4 sm:p-8 lg:p-12">
          <Image src={heroBg} alt="" fill priority placeholder="blur" sizes="(min-width: 1396px) 1300px, 100vw" className="object-cover" />
          <a href="#product" className="relative mx-auto mb-4 flex w-fit items-center gap-2.5 rounded-full bg-background py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-elevation-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:mb-6">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs text-background">1</span>
            Scroll to follow this trail · 7 steps
            <ArrowDown aria-hidden="true" className="size-4 shrink-0" />
          </a>
          <div className="relative"><MockGuard><BrowserMockup /></MockGuard></div>
        </div>
      </FadeUp>
    </section>
  );
}
