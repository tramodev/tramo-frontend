import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { FadeUp } from '@/components/landing/landing-motion';

const LINKS = [
  { href: '/about', label: 'Why I built it' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/changelog', label: 'Changelog' },
];

export function OpenSourceSection() {
  return <section id="open">
    <FadeUp className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <h2 className="landing-display max-w-[18ch] font-display text-[2rem] font-medium leading-[1.1] sm:text-[2.5rem]">Built by one person.</h2>
      <div>
        <p className="text-[1.0625rem] leading-relaxed text-muted-foreground">
          Tramo is a personal project by Ezequiel Martino, inspired by Vannevar Bush’s 1945 essay <i>As We May Think</i>. The code is open source under AGPL-3.0, and the roadmap and changelog are public.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem] font-medium">
          <li>
            <a href="https://github.com/tramodev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              Read the source<ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          {LINKS.map(({ href, label }) => <li key={href}>
            <Link href={href} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{label}<ArrowRight aria-hidden="true" className="size-4" /></Link>
          </li>)}
        </ul>
      </div>
    </FadeUp>
  </section>;
}
