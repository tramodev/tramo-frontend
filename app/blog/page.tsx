import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Ideas on connected thinking, notes on building Tramo, and what comes next.',
  alternates: { canonical: '/blog' },
};

const POSTS = [
  { category: 'Ideas', title: 'A note is only the beginning', description: 'Writing something down is a start. Connecting it to what you already know is where things get interesting.' },
  { category: 'Product', title: 'One note, more than one trail', description: 'The same idea can help explain different things. Trails let you reuse a note without making another copy.' },
  { category: 'Behind Tramo', title: 'Building a space for connected ideas', description: 'A look at the thinking behind Tramo, from the Memex to a small, open-source tool for making sense of what you know.' },
];

export default function BlogPage() {
  return <div className="min-h-screen">
    <Navbar />
    <main className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Blog</p>
      <h1 className="mb-6 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Notes along the way.</h1>
      <p className="mb-10 text-[17px] leading-7 text-muted-foreground">Ideas on connected thinking, notes on building Tramo, and what comes next.</p>
      <p className="mb-4 text-xs text-muted-foreground">Sample posts · Articles coming soon</p>
      <ul aria-label="Posts" className="divide-y divide-border border-y border-border">
        {POSTS.map(post => <li key={post.title}>
          <article className="py-8 sm:py-10">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{post.category}</span>
              <span className="rounded-full border border-border px-2 py-0.5">Draft</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-medium leading-tight text-foreground sm:text-[28px]">{post.title}</h2>
            <p className="max-w-[60ch] text-base leading-7 text-muted-foreground">{post.description}</p>
          </article>
        </li>)}
      </ul>
    </main>
    <Footer />
  </div>;
}
