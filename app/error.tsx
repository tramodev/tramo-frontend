'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/layout/logo';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <div>
    <div className="flex min-h-svh flex-col">
      <header className="container-app px-6 py-5 md:px-12">
        <Link href="/" aria-label="Tramo home"><Wordmark /></Link>
      </header>
      <main id="main-content" tabIndex={-1} className="container-app flex flex-1 flex-col items-center justify-center gap-5 px-6 py-20 text-center">
        <div aria-hidden="true" className="aspect-[3/2] w-52 bg-foreground [mask:url(/500.svg)_center/contain_no-repeat]" />
        <p className="text-sm font-medium text-muted-foreground">Error 500</p>
        <h1 className="font-display text-4xl">Something went wrong</h1>
        <p className="max-w-prose text-muted-foreground">Something on our side broke. Try again, or go back to your projects.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline"><Link href="/projects">Your projects</Link></Button>
        </div>
      </main>
    </div>
    <Footer />
  </div>;
}
