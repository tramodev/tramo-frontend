// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { ExploreCard } from "@/components/feed/explore-card"
import { Link2, Lock } from "lucide-react"
import type { ProjectFeedItem } from "@/lib/public-project"
import type { ProjectVisibility } from "@/lib/projects-store"
import { cn } from "@/lib/utils"

const MOCK_NEIGHBORS: ProjectFeedItem[] = [
  {
    id: "mock-1",
    title: "Mapping the origins of jazz",
    description: "A short trail through the roots of jazz, from New Orleans brass bands to bebop.",
    ownerUsername: "nolan",
    ownerAvatar: null,
    ownerBadge: null,
    thumbnailImageUrl: null,
    tags: ["music", "history"],
    modifiedDate: new Date().toISOString(),
    publishedDate: new Date().toISOString(),
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
  },
  {
    id: "mock-2",
    title: "A field guide to houseplants",
    description: "Light, water, and soil notes for the plants that actually survive my apartment.",
    ownerUsername: "sage",
    ownerAvatar: null,
    ownerBadge: null,
    thumbnailImageUrl: null,
    tags: ["plants", "guide"],
    modifiedDate: new Date().toISOString(),
    publishedDate: new Date().toISOString(),
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
  },
];

export function SharePreview({ card, visibility }: { card: ProjectFeedItem; visibility: ProjectVisibility }) {
  const isPublished = visibility === "published";

  return (
    <div className="flex flex-col gap-3 bg-muted p-7">
      <span className="mx-auto w-full max-w-[47rem] text-[0.75rem] font-semibold uppercase tracking-[.04em] text-muted-foreground">
        Explore preview
      </span>
      <div aria-hidden="true" inert className="mx-auto w-full max-w-[47rem] opacity-40">
        <ExploreCard project={MOCK_NEIGHBORS[0]} loggedIn={false} username={null} interactive={false} />
      </div>
      <div className={cn("relative mx-auto w-full max-w-[47rem] rounded-[14px] ring-2 transition-shadow", isPublished ? "ring-foreground" : "ring-border")}>
        <span className={cn("absolute -top-3 left-4 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase", isPublished ? "bg-foreground text-background" : "border border-border bg-background text-muted-foreground")}>
          {visibility === "private" && <Lock className="h-3 w-3" aria-hidden="true" />}
          {visibility === "unlisted" && <Link2 className="h-3 w-3" aria-hidden="true" />}
          {isPublished ? 'Your project' : visibility === "private" ? 'Private · Only you' : 'Unlisted · Link only'}
        </span>
        <div className={cn("transition-[filter,opacity]", !isPublished && "grayscale")}>
          <ExploreCard project={card} loggedIn={false} username={null} interactive={false} />
        </div>
      </div>
      <div aria-hidden="true" inert className="mx-auto w-full max-w-[47rem] opacity-40">
        <ExploreCard project={MOCK_NEIGHBORS[1]} loggedIn={false} username={null} interactive={false} />
      </div>
    </div>
  );
}
