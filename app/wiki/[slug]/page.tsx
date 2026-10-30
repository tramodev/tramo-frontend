import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SECTIONS } from '@/app/wiki/content';
import { WIKI_SCREENSHOTS } from '@/app/wiki/screenshots';

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
  const screenshots = WIKI_SCREENSHOTS[section.id];
  const firstScreenshot = section.features.flatMap(([title]) => screenshots?.[title] ?? [])[0]?.src;
  const sectionIndex = SECTIONS.indexOf(section);
  const previous = SECTIONS[sectionIndex - 1];
  const next = SECTIONS[sectionIndex + 1];
  return <article>
    <Link href="/wiki" className="mb-4 inline-block text-sm text-primary hover:underline">Wiki</Link>
    <h1 className="mb-6 font-display text-[clamp(32px,4vw,44px)] font-medium leading-tight">{section.title}</h1>
    {screenshots && <p className="mb-8 text-sm leading-6 text-muted-foreground">Screenshots use demonstration projects.</p>}
    <nav aria-label="On this page" className="mb-10 border-l border-border pl-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="space-y-2">{section.features.map(([title], index) => <li key={title}><a href={`#feature-${index + 1}`} className="text-sm text-primary hover:underline">{title}</a></li>)}</ul>
    </nav>
    <div className="space-y-8">
      {section.features.map(([title, description], index) => <section key={title} id={`feature-${index + 1}`} className="scroll-mt-24">
        <h2 className="mb-2 font-display text-2xl font-medium">{title}</h2>
        <p className="text-base leading-7 text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-start justify-center gap-x-6">
        {screenshots?.[title]?.map(screenshot => <figure key={screenshot.src} style={{ width: screenshot.width }} className="mt-5 max-w-full overflow-hidden rounded-lg border border-border bg-card">
          <div className="relative" style={{ aspectRatio: screenshot.width / screenshot.height }}>
            <Image src={screenshot.src} alt={screenshot.alt} fill loading={screenshot.src === firstScreenshot ? 'eager' : 'lazy'} unoptimized className="object-contain" />
          </div>
          <figcaption className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground">{screenshot.caption}</figcaption>
        </figure>)}
        </div>
      </section>)}
    </div>
    <nav aria-label="Topic navigation" className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm text-primary">
      <Link href="/wiki" className="hover:underline">Back to all topics</Link>
      <div className="flex flex-wrap gap-6">
        {previous && <Link href={`/wiki/${previous.id}`} rel="prev" className="hover:underline">← Previous: {previous.title}</Link>}
        {next && <Link href={`/wiki/${next.id}`} rel="next" className="hover:underline">Next: {next.title} →</Link>}
      </div>
    </nav>
  </article>;
}
