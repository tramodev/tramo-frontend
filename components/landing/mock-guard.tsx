// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Non-interactive on mobile so the demos don't trap swipes, taps or focus.
// max-md covers pre-hydration; the hook's breakpoint is wider, so it adds the classes too.
export function MockGuard({ children }: { children: React.ReactNode }) {
  const mobile = useIsMobile();
  return <div className={cn('max-md:pointer-events-none max-md:select-none', mobile && 'pointer-events-none select-none')} inert={mobile || undefined} aria-hidden={mobile || undefined}>{children}</div>;
}
