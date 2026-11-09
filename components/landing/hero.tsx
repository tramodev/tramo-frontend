// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaggerGroup, StaggerItem } from '@/components/landing/landing-motion';



export const Hero: React.FC = () => {
  return (
    <div className="relative">
      <StaggerGroup className="relative pt-[88px] text-center">
        <StaggerItem>
          <h1 className="landing-display font-display font-normal leading-[1.12] text-[clamp(40px,5.6vw,64px)]">
            <span className="block">Turn connected, reusable notes</span>{' '}
            <span className="block">into <strong className="font-semibold">trails</strong> for learning and explaining.</span>
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p className="text-[1.0625rem] leading-7 max-w-[58ch] mx-auto mt-8 text-muted-foreground">
            A trail is an ordered path through your notes. Write a note once, reuse it in as many trails as you need, and share a clear explanation.
          </p>
        </StaggerItem>
        <StaggerItem>
          <div className="flex gap-3 flex-wrap justify-center mt-8">
            <Button asChild size="xl" className="group h-13 px-8 text-base shadow-none hover:shadow-none active:scale-[0.98] has-[>svg]:px-8">
              <a href="/signup">Start writing<ArrowRight aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" /></a>
            </Button>
          </div>
        </StaggerItem>
      </StaggerGroup>
    </div>
  );
};
