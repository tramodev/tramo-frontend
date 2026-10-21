import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getRoadmap } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'What’s next for Tramo: collaboration, AI integration, better version history and infrastructure that can grow with the community.',
  alternates: { canonical: '/roadmap' },
};

const STATUS_LABELS = { PLANNED: 'Planned', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };

export default async function RoadmapPage() {
  await connection();
  const items = await getRoadmap();
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Roadmap</p>
      <h1 className="mb-8 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Where Tramo goes next.</h1>
      <p className="mb-12 text-[1.0625rem] leading-7 text-muted-foreground">These are the things we want to build next. They’re a direction, not a release schedule: priorities may change as we learn from the people using Tramo.</p>
      <div className="space-y-10">
        {items.map(item => <section key={item.id} aria-labelledby={`roadmap-${item.id}`}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{STATUS_LABELS[item.status]}</p>
          <h2 id={`roadmap-${item.id}`} className="mb-3 font-display text-2xl font-medium">{item.title}</h2>
          <p className="whitespace-pre-wrap break-words text-base leading-7 text-muted-foreground">{item.description}</p>
        </section>)}
        {items.length === 0 && <p className="text-sm text-muted-foreground">More plans coming soon.</p>}
      </div>
      <div className="mt-12 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
        <p className="mb-3">Tramo stays free. Supporters help maintain what’s here and give us more room to build what’s next.</p>
        <p>What would help you most? <a href="mailto:contact@tramo.dev" className="text-primary underline underline-offset-4">Tell us at contact@tramo.dev</a>.</p>
      </div>
    </main>
    <Footer />
  </div>;
}
