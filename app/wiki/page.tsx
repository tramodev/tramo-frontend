import type { Metadata } from 'next';
import Link from 'next/link';
import { GROUPS } from '@/app/wiki/content';

export const metadata: Metadata = {
  title: 'Wiki',
  description: 'Learn to use Tramo: projects, notes, trails, connections and publishing.',
  alternates: { canonical: '/wiki' },
};

export default function WikiPage() {
  return <>
    <header className="mb-12">
      <p className="mb-4 text-sm font-medium text-primary">Documentation</p>
      <h1 className="mb-6 font-display text-[clamp(36px,5vw,48px)] font-medium leading-[1.1]">Tramo Wiki</h1>
      <p className="text-[17px] leading-7 text-muted-foreground">A place to learn how to turn individual notes into connected ideas and trails others can follow.</p>
    </header>
    <div className="space-y-10">
      {GROUPS.map(group => <section key={group.title}>
        <h2 className="mb-4 font-display text-2xl font-medium">{group.title}</h2>
        <ul className="space-y-3 border-l border-border pl-5">
          {group.sections.map(section => <li key={section.id}><Link href={`/wiki/${section.id}`} className="text-[15px] text-primary underline-offset-4 hover:underline">{section.title}</Link></li>)}
        </ul>
      </section>)}
      <section>
        <h2 className="mb-4 font-display text-2xl font-medium">Help</h2>
        <p className="text-[15px] leading-7 text-muted-foreground">Have a question or found something missing? <a href="mailto:contact@tramo.dev" className="text-primary underline underline-offset-4">Get in touch</a>.</p>
      </section>
    </div>
  </>;
}
