import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { WikiNav } from '@/components/layout/wiki-nav';

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">
    <Navbar />
    <div className="container-app grid items-start gap-10 px-6 pb-[84px] pt-10 md:px-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:border-r lg:border-border lg:pr-6">
        <WikiNav />
      </aside>
      <main id="main-content" tabIndex={-1} className="container-read min-w-0"><span id="wiki-content" />{children}</main>
    </div>
    <Footer />
  </div>;
}
