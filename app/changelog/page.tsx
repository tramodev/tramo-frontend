import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getChangelog } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Recent additions, improvements and fixes in Tramo.',
  alternates: { canonical: '/changelog' },
};

export default async function ChangelogPage() {
  await connection();
  const entries = await getChangelog();
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Changelog</p>
      <h1 className="mb-6 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">A little better, every time.</h1>
      <p className="mb-10 text-[17px] leading-7 text-muted-foreground">Small additions, improvements and fixes as Tramo grows.</p>
      <section aria-labelledby="recent-updates-heading" className="border-t border-border pt-8">
        <h2 id="recent-updates-heading" className="mb-6 font-display text-2xl font-medium text-foreground">Recent updates</h2>
        <ul className="space-y-6">
          {entries.map(entry => <li key={entry.id}>
            <time dateTime={entry.publishedDate} className="mb-2 block text-xs text-muted-foreground">{entry.publishedDate}</time>
            <h3 className="mb-1 font-medium text-foreground">{entry.title}</h3>
            <p className="whitespace-pre-wrap break-words text-base leading-7 text-muted-foreground">{entry.content}</p>
          </li>)}
        </ul>
        {entries.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
      </section>
    </main>
    <Footer />
  </div>;
}
