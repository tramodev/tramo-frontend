// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { ExploreCard } from "@/components/feed/explore-card"
import type { ProjectFeedItem } from "@/lib/public-project"

const MOCK_NEIGHBORS: ProjectFeedItem[] = [
  {
    id: "mock-1",
    title: "Mapping the origins of jazz",
    description: "A short trail through the roots of jazz, from New Orleans brass bands to bebop.",
    ownerUsername: "nolan",
    ownerAvatar: null,
    ownerBadge: null,
    thumbnailImageUrl: null,
    thumbnailGraph: null,
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
    thumbnailGraph: null,
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

export function SharePreview({ card }: { card: ProjectFeedItem }) {
  return (
    <div className="flex flex-col gap-3 bg-muted p-7">
      <span className="mx-auto w-full max-w-[752px] text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
        Explore preview
      </span>
      <div className="mx-auto w-full max-w-[752px] opacity-40">
        <ExploreCard project={MOCK_NEIGHBORS[0]} loggedIn={false} username={null} interactive={false} />
      </div>
      <div className="relative mx-auto w-full max-w-[752px] rounded-[14px] ring-2 ring-foreground">
        <span className="absolute -top-3 left-4 z-10 rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-medium uppercase text-background">
          Your project
        </span>
        <ExploreCard project={card} loggedIn={false} username={null} interactive={false} />
      </div>
      <div className="mx-auto w-full max-w-[752px] opacity-40">
        <ExploreCard project={MOCK_NEIGHBORS[1]} loggedIn={false} username={null} interactive={false} />
      </div>
    </div>
  );
}
