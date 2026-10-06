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
            <span className="block text-primary font-medium">into trails for learning and explaining.</span>
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p className="text-[17px] leading-7 max-w-[58ch] mx-auto mt-8 text-muted-foreground">
            Start writing now. Organize your notes as you go, reuse them in different trails, and share a clear explanation.
          </p>
        </StaggerItem>
        <StaggerItem>
          <div className="flex gap-3 flex-wrap justify-center mt-8">
            <Button asChild size="xl">
              <a href="/signup">Start for free</a>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <a href="#product">See how it works</a>
            </Button>
          </div>
        </StaggerItem>
      </StaggerGroup>
    </div>
  );
};
