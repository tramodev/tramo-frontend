// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Button } from '@/components/ui/button';
import { StaggerGroup, StaggerItem } from '@/components/landing/landing-motion';



export const Hero: React.FC = () => {
  return (
    <div className="relative">
      <StaggerGroup className="relative pt-[88px] text-center">
        <StaggerItem>
          <h1 className="font-display font-normal leading-[1.12] text-[clamp(40px,5.6vw,64px)]">
            <span className="block">Turn connected, reusable notes</span>
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
            <Button asChild size="xl">
              <a href="/signup">Start for free</a>
            </Button>
            <Button asChild variant="outline" size="xl">
              <a href="#product">See how it works</a>
            </Button>
          </div>
        </StaggerItem>
      </StaggerGroup>
    </div>
  );
};
