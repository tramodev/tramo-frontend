import { ArrowRight, Check, Globe, Lock, Users } from 'lucide-react';
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
    <div className="mb-4 text-sm font-medium text-primary">Explore & publish</div>
    <h2 className="mb-3.5 max-w-[25ch] font-display text-[40px] font-medium leading-[1.1]">Your thinking doesn’t have to end with you.</h2>
    <p className="mb-10 max-w-[60ch] text-[17px] leading-relaxed text-muted-foreground">Follow someone else’s trail. Share a path of your own. Build on ideas instead of starting from a blank page.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <FadeUp className="h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-t-[28px] rounded-b-sm bg-card">
          <div className="flex flex-1 flex-col p-6 sm:p-9">
          <h3 className="mb-3 font-display text-2xl font-medium">Find your next thread.</h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">Discover published projects, follow their trails, and fork a project to explore ideas in a new direction.</p>
          <Button asChild variant="secondary" size="lg" className="mt-auto self-start">
            <a href="/explore">Explore projects<ArrowRight className="h-4 w-4" /></a>
          </Button>
          </div>
          <div aria-hidden="true" inert className="relative mx-6 h-[320px] overflow-hidden rounded-t-xl border border-b-0 border-border bg-background [container-type:inline-size] sm:mx-9">
            <div className="absolute left-0 top-0 w-[680px] origin-top-left space-y-4 p-6 [transform:scale(calc(100cqw/680px))]">
              <p className="font-display text-3xl font-medium">Explore</p>
              <ExploreCard project={PREVIEW_PROJECT} loggedIn={false} username={null} interactive={false} />
              <ExploreCard project={{ ...PREVIEW_PROJECT, id: 'landing-preview-2', title: 'Mapping the origins of jazz', description: 'A short trail through the roots of jazz, from New Orleans brass bands to bebop.', ownerUsername: 'nolan', thumbnailImageUrl: null, tags: ['music', 'history'] }} loggedIn={false} username={null} interactive={false} />
            </div>
          </div>
        </div>
      </FadeUp>
      <FadeUp delay={0.1} className="h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-t-[28px] rounded-b-sm bg-card">
          <div className="flex flex-1 flex-col p-6 sm:p-9">
          <h3 className="mb-3 font-display text-2xl font-medium">Publish when you’re ready.</h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground">Share a snapshot readers can follow, note by note. Keep working privately and publish an update when it’s ready.</p>
          </div>
          <div aria-hidden="true" inert className="mx-6 h-[320px] overflow-hidden rounded-t-xl border border-b-0 border-border bg-background p-5 sm:mx-9 sm:p-6">
            <p className="mb-4 text-[17px] font-semibold">Share</p>
            <p className="mb-2 text-sm font-medium">Visibility</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5">
                <Lock className="h-4 w-4 shrink-0" />
                <span className="min-w-0"><span className="block text-[13px] font-medium">Private</span><span className="block text-xs text-muted-foreground">Only you can access this project</span></span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5">
                <Users className="h-4 w-4 shrink-0" />
                <span className="min-w-0"><span className="block text-[13px] font-medium">Unlisted</span><span className="block text-xs text-muted-foreground">Anyone with the link can view it</span></span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-foreground bg-foreground/5 px-3.5 py-2.5">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">Published</span><span className="block text-xs text-muted-foreground">Listed on Explore for everyone</span></span>
                <Check className="h-4 w-4 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </FadeUp>
    </div>
  </section>;
}
