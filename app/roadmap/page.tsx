import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'What’s next for Tramo: collaboration, better version history and infrastructure that can grow with the community.',
  alternates: { canonical: '/roadmap' },
};

export default function RoadmapPage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Roadmap</p>
      <h1 className="mb-8 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Where Tramo goes next.</h1>
      <p className="mb-12 text-[17px] leading-7 text-muted-foreground">These are the things we want to build next. They’re a direction, not a release schedule: priorities may change as we learn from the people using Tramo.</p>
      <div className="space-y-10">
        <section aria-labelledby="collaboration-heading">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Planned</p>
          <h2 id="collaboration-heading" className="mb-3 font-display text-2xl font-medium">Collaboration</h2>
          <p className="text-base leading-7 text-muted-foreground">Work on projects together. The goal is to let people contribute to shared notes and trails, building an explanation with others instead of working alone.</p>
        </section>
        <section aria-labelledby="versions-heading">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Planned</p>
          <h2 id="versions-heading" className="mb-3 font-display text-2xl font-medium">Better version history</h2>
          <p className="text-base leading-7 text-muted-foreground">Make it easier to understand how a project has changed, compare earlier versions and revisit previous work. A clearer history should help you keep exploring ideas without losing track of what came before.</p>
        </section>
        <section aria-labelledby="infrastructure-heading">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Planned</p>
          <h2 id="infrastructure-heading" className="mb-3 font-display text-2xl font-medium">Scalable infrastructure</h2>
          <p className="text-base leading-7 text-muted-foreground">Build the foundations to keep Tramo responsive and reliable as more people, projects and notes join. Growth should mean more room for ideas, not a slower tool.</p>
        </section>
      </div>
      <div className="mt-12 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
        <p className="mb-3">Tramo stays free. Supporters help maintain what’s here and give us more room to build what’s next.</p>
        <p>What would help you most? <a href="mailto:contact@tramo.dev" className="text-primary underline underline-offset-4">Tell us at contact@tramo.dev</a>.</p>
      </div>
    </main>
    <Footer />
  </div>;
}
