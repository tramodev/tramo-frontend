'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const RESOURCE_LINKS = [
  { href: '/wiki', label: 'Wiki' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/blog', label: 'Blog' },
];

export function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function keepOpen() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeAfterHover() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  return <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild>
      <button type="button" onMouseEnter={keepOpen} onMouseLeave={closeAfterHover} className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-muted data-[state=open]:text-foreground">Resources<ChevronDown aria-hidden="true" className="size-3.5" /></button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-44" onMouseEnter={keepOpen} onMouseLeave={closeAfterHover}>
      {RESOURCE_LINKS.map(({ href, label }) => <DropdownMenuItem key={href} asChild><Link href={href}>{label}</Link></DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}
