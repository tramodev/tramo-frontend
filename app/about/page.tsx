import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description: 'Tramo is a free, open-source space for connected ideas, sustained by people who want to help it grow.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">About Tramo</p>
      <h1 className="mb-8 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Free to use.<br />Your ideas, your space.</h1>
      <p className="mb-12 text-[17px] leading-7 text-muted-foreground">Tramo is a place to write, connect ideas and build trails through what you know. Inspired by the Memex, it lets a note belong to more than one path, so your thinking can grow without being boxed into a single outline.</p>
      <div className="space-y-10">
        <section aria-labelledby="free-heading">
          <h2 id="free-heading" className="mb-3 font-display text-2xl font-medium">A useful tool shouldn’t be out of reach.</h2>
          <p className="text-base leading-7 text-muted-foreground">Tramo is free. Writing notes, connecting them, building trails, exploring projects and publishing your work aren’t a trial or a teaser for a paid plan. You don’t need a subscription to do the things Tramo was built for.</p>
        </section>
        <section aria-labelledby="ownership-heading">
          <h2 id="ownership-heading" className="mb-3 font-display text-2xl font-medium">Your work stays yours.</h2>
          <p className="text-base leading-7 text-muted-foreground">Your notes, connections and trails belong to you. You choose what to publish and when to share it. Tramo is open source, too: you can see how it works, suggest improvements and help shape what comes next.</p>
        </section>
        <section aria-labelledby="support-heading">
          <h2 id="support-heading" className="mb-3 font-display text-2xl font-medium">Free doesn’t mean it runs on nothing.</h2>
          <p className="mb-4 text-base leading-7 text-muted-foreground">Hosting, storage and ongoing development take resources. Supporters help keep Tramo running, maintain what’s already here and make room for new ideas and improvements.</p>
          <p className="text-base leading-7 text-muted-foreground">Supporting is optional. It’s a way to sustain and expand a tool you value, not a requirement to use it. If you can’t contribute financially, using Tramo, sharing feedback or telling someone about it helps, too.</p>
        </section>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg"><a href="https://www.patreon.com/tramodev" target="_blank" rel="noopener noreferrer">Support Tramo<span className="sr-only"> (opens in a new tab)</span></a></Button>
        <Button asChild size="lg" variant="secondary"><a href="https://github.com/tramodev" target="_blank" rel="noopener noreferrer">Explore the source<span className="sr-only"> (opens in a new tab)</span></a></Button>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Questions, ideas or feedback? <a href="mailto:contact@tramo.dev" className="text-primary underline underline-offset-4">contact@tramo.dev</a></p>
    </main>
    <Footer />
  </div>;
}
