import Link from 'next/link';
import { Wordmark } from '@/components/layout/logo';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return <div className="flex min-h-svh flex-col">
    <header className="container-app px-6 py-5 md:px-12">
      <Link href="/" aria-label="Tramo home"><Wordmark /></Link>
    </header>
    <main className="container-app flex flex-1 flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="max-w-prose text-muted-foreground">This page is unavailable. Explore published projects or return to your workspace.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild><Link href="/projects">Your projects</Link></Button>
        <Button asChild variant="outline"><Link href="/explore">Explore</Link></Button>
      </div>
    </main>
    <Footer />
  </div>;
}
