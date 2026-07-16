import React from 'react';
import { Button } from '@/components/ui/button';

export const PosterCta: React.FC = () => {
  return (
    <div className="max-w-[1216px] mx-auto px-[72px] mb-[84px]">
      <div className="rounded-[28px] overflow-hidden bg-accent text-accent-foreground">
        <div className="p-[72px]">
          <h3 className="font-display font-normal text-[52px] leading-[1.1]">
            <span className="block">Find your path.</span>
          </h3>
          <p className="text-[17px] leading-7 max-w-[46ch] mt-4 opacity-85">
            One idea at a time, until it all connects.
          </p>
          <div className="mt-9">
            <Button asChild size="xl">
              <a href="/signup">Start for free</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
