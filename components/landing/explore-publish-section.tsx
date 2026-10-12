import { ArrowRight, Compass, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeUp } from '@/components/landing/landing-motion';

export function ExplorePublishSection() {
  return <section id="community" className="pt-16 pb-[84px]">
    <div className="mb-4 text-sm font-medium text-primary">Explore & publish</div>
    <h2 className="mb-3.5 max-w-[25ch] font-display text-[40px] font-medium leading-[1.1]">Your thinking doesn’t have to end with you.</h2>
    <p className="mb-10 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">Follow someone else’s trail. Share a path of your own. Build on ideas instead of starting from a blank page.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <FadeUp className="h-full">
        <div className="flex h-full flex-col rounded-[28px] bg-card p-6 sm:p-9">
          <Compass className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
          <h3 className="mb-3 font-display text-2xl font-medium">Find your next thread.</h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">Discover published projects, follow their trails, and fork a project to explore ideas in a new direction.</p>
          <Button asChild variant="secondary" size="lg" className="mt-auto self-start">
            <a href="/explore">Explore projects<ArrowRight className="h-4 w-4" /></a>
          </Button>
        </div>
      </FadeUp>
      <FadeUp delay={0.1} className="h-full">
        <div className="flex h-full flex-col rounded-[28px] bg-card p-6 sm:p-9">
          <Globe className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
          <h3 className="mb-3 font-display text-2xl font-medium">Publish when you’re ready.</h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">Share a snapshot readers can follow, note by note. Keep working privately and publish an update when it’s ready.</p>
          <Button asChild size="lg" className="mt-auto self-start">
            <a href="/signup">Start your own project<ArrowRight className="h-4 w-4" /></a>
          </Button>
        </div>
      </FadeUp>
    </div>
  </section>;
}
