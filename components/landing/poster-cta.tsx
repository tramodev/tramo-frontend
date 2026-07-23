'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { TRAIL_PATHS, TRAIL_CIRCLES } from '@/components/auth/auth-poster';
import { EASE } from '@/components/landing/landing-motion';

// One continuous stroke: main trail eases in, both fork branches take over the
// instant its tip reaches the fork (0.9s) already at speed, the faint spur
// departs as the tip passes its junction (~0.6s), dots land with their branch.
const PATH_DELAYS = [0, 0.9, 0.9, 0.6];
const PATH_DURATIONS = [0.9, 0.65, 0.65, 0.5];
const PATH_EASES = ['easeIn', EASE, EASE, EASE] as const;
const CIRCLE_DELAYS = [1.45, 1.45, 1.0];

// whileInView lives on the <svg>, not the paths: individual paths are mostly
// clipped out of the card, so their own observers would never fire.
function AnimatedTrailArt() {
  return (
    <motion.svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 688 868"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      {TRAIL_PATHS.map((p, i) => (
        <motion.path
          key={p.d}
          d={p.d}
          className="stroke-primary"
          strokeWidth="10"
          strokeLinecap="round"
          variants={{
            // opacity 0 until the draw starts, else the round line-cap shows as a dot
            hidden: { pathLength: 0, opacity: 0 },
            visible: {
              pathLength: 1,
              opacity: p.opacity,
              transition: {
                pathLength: { duration: PATH_DURATIONS[i], ease: PATH_EASES[i], delay: PATH_DELAYS[i] },
                opacity: { duration: 0.01, delay: PATH_DELAYS[i] },
              },
            },
          }}
        />
      ))}
      {TRAIL_CIRCLES.map((c, i) => (
        <motion.circle
          key={`${c.cx}-${c.cy}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          className={c.fill ? 'fill-primary' : 'stroke-primary'}
          fill={c.fill ? undefined : 'none'}
          strokeWidth={c.strokeWidth}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: c.opacity, transition: { duration: 0.3, delay: CIRCLE_DELAYS[i] } },
          }}
        />
      ))}
    </motion.svg>
  );
}

export const PosterCta: React.FC = () => {
  return (
    <div className="max-w-[1216px] mx-auto px-6 md:px-[72px] mb-[84px]">
      <div className="relative rounded-[28px] overflow-hidden bg-accent text-accent-foreground">
        <AnimatedTrailArt />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-accent from-55% to-transparent" />
        <div className="relative p-8 md:p-[72px]">
          <h3 className="font-display font-normal text-[clamp(32px,6vw,52px)] leading-[1.1]">
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
