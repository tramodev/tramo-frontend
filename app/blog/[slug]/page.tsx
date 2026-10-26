import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getBlogPost } from '@/lib/site-content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return { title: post.title, description: post.summary, alternates: { canonical: `/blog/${post.slug}` } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return <div className="min-h-screen">
    <Navbar />
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <Link href="/blog" className="mb-6 inline-block text-sm text-primary hover:underline">Back to blog</Link>
      <article>
        <div className="mb-4 flex gap-3 text-xs text-muted-foreground"><span>{post.category}</span><time dateTime={post.publishedDate}>{post.publishedDate}</time></div>
        <h1 className="mb-6 font-display text-[clamp(36px,5vw,48px)] font-medium leading-tight">{post.title}</h1>
        <p className="mb-10 text-[1.0625rem] leading-7 text-muted-foreground">{post.summary}</p>
        <div className="whitespace-pre-wrap break-words text-base leading-8">{post.content}</div>
      </article>
    </main>
    <Footer />
  </div>;
}
