import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Recent additions, improvements and fixes in Tramo.',
  alternates: { canonical: '/changelog' },
};

export default function ChangelogPage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Changelog</p>
      <h1 className="mb-6 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">A little better, every time.</h1>
      <p className="mb-10 text-[17px] leading-7 text-muted-foreground">Small additions, improvements and fixes as Tramo grows.</p>
      <section aria-labelledby="recent-updates-heading" className="border-t border-border pt-8">
        <h2 id="recent-updates-heading" className="mb-6 font-display text-2xl font-medium text-foreground">Recent updates</h2>
        <ul className="space-y-6">
          <li>
            <h3 className="mb-1 font-medium text-foreground">Project storage breakdown</h3>
            <p className="text-base leading-7 text-muted-foreground">See how much space a project uses for images and text. Open Usage breakdown from the project’s three-dot menu.</p>
          </li>
          <li>
            <h3 className="mb-1 font-medium text-foreground">More reliable image cleanup</h3>
            <p className="text-base leading-7 text-muted-foreground">Unused public uploads are now covered by automatic cleanup. Images used by notes or published versions stay protected.</p>
          </li>
          <li>
            <h3 className="mb-1 font-medium text-foreground">A clearer introduction to Tramo</h3>
            <p className="text-base leading-7 text-muted-foreground">Simpler feature previews on the homepage, with more room for the mockups and a better fit on smaller screens.</p>
          </li>
        </ul>
      </section>
    </main>
    <Footer />
  </div>;
}
