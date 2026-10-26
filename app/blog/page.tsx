import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getBlogPosts } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Ideas on connected thinking, notes on building Tramo, and what comes next.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage() {
  await connection();
  const posts = await getBlogPosts();
  return <div className="min-h-screen">
    <Navbar />
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Blog</p>
      <h1 className="mb-6 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Notes along the way.</h1>
      <p className="mb-10 text-[1.0625rem] leading-7 text-muted-foreground">Ideas on connected thinking, notes on building Tramo, and what comes next.</p>
      {posts.length === 0 && <p className="text-sm text-muted-foreground">Articles coming soon.</p>}
      <ul aria-label="Posts" className="divide-y divide-border border-y border-border">
        {posts.map(post => <li key={post.slug}>
          <article className="py-8 sm:py-10">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{post.category}</span>
              <time dateTime={post.publishedDate}>{post.publishedDate}</time>
            </div>
            <h2 className="mb-3 font-display text-2xl font-medium leading-tight text-foreground sm:text-[1.75rem]"><Link href={`/blog/${post.slug}`} className="hover:text-primary">{post.title}</Link></h2>
            <p className="max-w-[60ch] text-base leading-7 text-muted-foreground">{post.summary}</p>
          </article>
        </li>)}
      </ul>
    </main>
    <Footer />
  </div>;
}
