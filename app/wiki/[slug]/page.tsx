import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTIONS } from '@/app/wiki/content';

export function generateStaticParams() {
  return SECTIONS.map(section => ({ slug: section.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const section = SECTIONS.find(section => section.id === slug);
  if (!section) notFound();
  return {
    title: `${section.title} · Wiki`,
    description: section.features[0][1],
    alternates: { canonical: `/wiki/${section.id}` },
  };
}

export default async function WikiTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = SECTIONS.find(section => section.id === slug);
  if (!section) notFound();
  return <article>
    <Link href="/wiki" className="mb-4 inline-block text-sm text-primary hover:underline">Wiki</Link>
    <h1 className="mb-6 font-display text-[clamp(32px,4vw,44px)] font-medium leading-tight">{section.title}</h1>
    <nav aria-label="On this page" className="mb-10 border-l border-border pl-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="space-y-2">{section.features.map(([title], index) => <li key={title}><a href={`#feature-${index + 1}`} className="text-sm text-primary hover:underline">{title}</a></li>)}</ul>
    </nav>
    <div className="space-y-8">
      {section.features.map(([title, description], index) => <section key={title} id={`feature-${index + 1}`} className="scroll-mt-24">
        <h2 className="mb-2 font-display text-2xl font-medium">{title}</h2>
        <p className="text-base leading-7 text-muted-foreground">{description}</p>
      </section>)}
    </div>
    <div className="mt-12 border-t border-border pt-6"><Link href="/wiki" className="text-sm text-primary hover:underline">Back to all topics</Link></div>
  </article>;
}
