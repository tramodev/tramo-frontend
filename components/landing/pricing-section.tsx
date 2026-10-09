// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeUp } from '@/components/landing/landing-motion';

const PATREON_URL = 'https://www.patreon.com/tramodev';

const FREE_FEATURES = [
  'Unlimited public projects',
  'Unlimited publishing',
  'Full social layer — follow, fork, comment, upvote',
  '500MB storage',
];

const SUPPORTER_FEATURES = [
  'Everything in Free',
  '10GB storage',
  'Animated GIF avatar',
  'Profile banner',
  'Supporter badge on your profile',
];

export const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="pt-16 pb-[84px]">
      <span className="mb-6 block text-sm font-medium text-primary">Plans</span>

      <div className="grid items-stretch gap-4 md:grid-cols-[1.55fr_1fr]">
        <FadeUp>
          <div className="flex h-full flex-col rounded-[28px] bg-card p-11">
            <span className="mb-[22px] self-start rounded-full bg-secondary px-[13px] py-[5px] text-xs font-semibold text-secondary-foreground">
              Free forever · no card required
            </span>
            <h2 className="mb-2.5 font-display text-4xl font-medium leading-[1.08] tracking-[-.02em]">
              Tramo is free.
            </h2>
            <p className="mb-7 max-w-[46ch] text-base leading-[1.6] text-muted-foreground text-pretty">
              Everything you need to connect notes — the editor, trails, the map, and the full
              social layer. No trial, no tiers gated behind a paywall.
            </p>
            <div className="mb-8 grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2">
              {FREE_FEATURES.map((feature) => (
                <span key={feature} className="flex items-start gap-2.5 text-[15px]">
                  <Check className="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={2.4} />
                  {feature}
                </span>
              ))}
            </div>
            <Button asChild className="mt-auto h-[54px] w-full rounded-[14px] text-base">
              <a href="/signup">Start for free</a>
            </Button>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="flex h-full flex-col rounded-[28px] border border-border bg-card p-11">
            <div className="mb-2 flex items-center gap-[9px]">
              <span className="font-display text-[23px] font-medium">Supporter</span>
              <Heart className="h-[19px] w-[19px] fill-current text-[var(--ed-red)]" strokeWidth={0} />
            </div>
            <p className="mb-[22px] text-sm leading-[1.55] text-muted-foreground text-pretty">
              Love Tramo? Chip in on Patreon and get a little more room — plus a thank-you.
            </p>
            <div className="mb-[22px] flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-medium">$5</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <div className="mb-[26px] flex flex-col gap-2.5">
              {SUPPORTER_FEATURES.map((feature) => (
                <span key={feature} className="flex items-center gap-[9px] text-[13.5px] text-muted-foreground">
                  <Check className="h-[15px] w-[15px] shrink-0 text-[var(--ed-red)]" strokeWidth={2.4} />
                  {feature}
                </span>
              ))}
            </div>
            <Button
              asChild
              className="mt-auto h-[54px] w-full rounded-[14px] text-[15px] font-semibold"
            >
              <a href={PATREON_URL} target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="15" cy="8.5" r="6.5" />
                  <rect x="2" y="2" width="3.5" height="20" />
                </svg>
                Support on Patreon
              </a>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};
