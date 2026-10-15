'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { GROUPS } from '@/app/wiki/content';
import { cn } from '@/lib/utils';

export function WikiNav() {
  const pathname = usePathname();
  return <nav aria-label="Documentation" className="text-sm">
    <Link href="/wiki" aria-current={pathname === '/wiki' ? 'page' : undefined} className={cn('mb-4 block rounded-md px-3 py-2 font-medium', pathname === '/wiki' ? 'bg-secondary text-secondary-foreground' : 'text-foreground hover:bg-muted')}>Tramo Wiki</Link>
    <div key={pathname} className="space-y-2">
      {GROUPS.map((group, index) => <details key={group.title} open={group.sections.some(section => pathname === `/wiki/${section.id}`) || (pathname === '/wiki' && index === 0)} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
          {group.title}
        </summary>
        <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {group.sections.map(section => {
            const active = pathname === `/wiki/${section.id}`;
            return <li key={section.id}><Link href={`/wiki/${section.id}`} aria-current={active ? 'page' : undefined} className={cn('block rounded-md px-3 py-2 transition-colors', active ? 'bg-secondary font-medium text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{section.title}</Link></li>;
          })}
        </ul>
      </details>)}
    </div>
  </nav>;
}
