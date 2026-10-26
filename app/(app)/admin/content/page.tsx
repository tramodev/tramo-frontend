import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentManager } from '@/components/admin/content-manager';
import { getAdminContent } from '@/lib/site-content';
import { isAdmin } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Site content',
  robots: { index: false, follow: false },
};

export default async function ContentAdminPage() {
  if (!(await isAdmin())) notFound();
  const content = await getAdminContent();
  return <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1000px] flex-1 px-8 py-8">
    <Link href="/admin" className="mb-6 inline-block text-sm text-primary hover:underline">Back to admin</Link>
    <h1 className="mb-3 font-display text-3xl font-medium">Site content</h1>
    <p className="mb-8 text-sm text-muted-foreground">Manage the blog, changelog and roadmap. Saving updates the public cache automatically.</p>
    <ContentManager content={content} />
  </main>;
}
