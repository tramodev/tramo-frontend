import { ArrowRight, Check, Globe, Lock } from 'lucide-react';
import { ExploreCard } from '@/components/feed/explore-card';
import { Button } from '@/components/ui/button';
import { FadeUp } from '@/components/landing/landing-motion';
import type { ProjectFeedItem } from '@/lib/public-project';

const PREVIEW_PROJECT: ProjectFeedItem = {
  id: 'landing-preview',
  title: 'Memex and Vannevar Bush',
  description: 'An exploration of the Memex, associative trails, and the ideas that shaped personal knowledge.',
  ownerUsername: 'alex',
  ownerAvatar: null,
  ownerBadge: null,
  thumbnailImageUrl: '/memex-example.png',
  tags: ['history', 'knowledge'],
  modifiedDate: '2026-10-01T12:00:00Z',
  publishedDate: null,
  lastPublishedDate: null,
  voteCount: 0,
  votedByRequester: false,
  bookmarkedByRequester: false,
  viewCount: 0,
  forkCount: 0,
  commentCount: 0,
  featured: false,
  forkedFromProjectId: null,
  forkedFromTitle: null,
  forkedFromOwnerUsername: null,
  canFork: true,
};

export function ExplorePublishSection() {
  return <section id="community" className="pt-16 pb-[84px]">
    <h2 className="landing-display mb-3.5 max-w-[25ch] font-display text-[2.5rem] font-medium leading-[1.1]">Your thinking doesn’t have to end with you.</h2>
    <p className="mb-10 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted-foreground">Follow someone else’s trail. Share a path of your own. Build on ideas instead of starting from a blank page.</p>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-16 md:grid-cols-2 md:gap-12 lg:gap-16">
      <FadeUp className="h-full">
        <div className="flex h-full flex-col">
          <div className="flex flex-1 flex-col pb-8">
          <h3 className="mb-3 font-display text-2xl font-medium">Find your next thread.</h3>
          <p className="mb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">Discover published projects and follow their trails to find your next idea.</p>
          <Button asChild variant="secondary" size="lg" className="mt-auto self-start">
            <a href="/explore">Explore projects<ArrowRight className="h-4 w-4" /></a>
          </Button>
          </div>
          <div aria-hidden="true" inert className="relative h-[320px] overflow-hidden rounded-xl border border-border bg-background [container-type:inline-size]">
            <div className="absolute left-0 top-0 w-[680px] origin-top-left space-y-4 p-6 [transform:scale(calc(100cqw/680px))]">
              <p className="font-display text-3xl font-medium">Example projects</p>
              <ExploreCard project={{ ...PREVIEW_PROJECT, id: 'landing-fork', title: 'New trails through the Memex', description: 'A new perspective built on a shared starting point.', ownerUsername: 'nolan', forkedFromProjectId: PREVIEW_PROJECT.id, forkedFromTitle: PREVIEW_PROJECT.title, forkedFromOwnerUsername: PREVIEW_PROJECT.ownerUsername }} loggedIn={false} username={null} interactive={false} />
              <ExploreCard project={PREVIEW_PROJECT} loggedIn={false} username={null} interactive={false} />
            </div>
          </div>
        </div>
      </FadeUp>
      <FadeUp delay={0.1} className="h-full">
        <div className="flex h-full flex-col">
          <div className="flex flex-col pb-8">
          <h3 className="mb-3 font-display text-2xl font-medium">Publish when you’re ready.</h3>
          <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">Share a snapshot readers can follow, note by note. Keep working privately and publish an update when it’s ready.</p>
          </div>
          <div aria-hidden="true" inert className="flex min-h-[320px] flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-background p-5">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Visibility</p>
              <div className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5">
                <Lock className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-[0.8125rem] font-medium">Private</span><span className="block truncate text-xs text-muted-foreground">Only you and the people you share it with</span></span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-foreground bg-foreground/5 px-3.5 py-2.5">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-[0.8125rem] font-medium">Published</span><span className="block truncate text-xs text-muted-foreground">Listed on Explore for everyone</span></span>
                <Check className="h-4 w-4 shrink-0" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Description</p>
              <p className="rounded-xs border border-input px-4 py-2.5 text-sm">{PREVIEW_PROJECT.description}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {PREVIEW_PROJECT.tags.map(tag => <span key={tag} className="rounded-sm border border-border px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">{tag}</span>)}
              </div>
            </div>
          </div>
        </div>
      </FadeUp>
    </div>
  </section>;
}
