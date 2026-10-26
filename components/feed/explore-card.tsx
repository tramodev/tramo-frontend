// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import Link from "next/link"
import { Eye, MessageCircle } from "lucide-react"
import { VoteButton } from "@/components/social/vote-button"
import { BookmarkButton } from "@/components/social/bookmark-button"
import { PostOptionsMenu } from "@/components/project/post-options-menu"
import { AuthorAvatar } from "@/components/shared/author-avatar"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"
import { NameBadge } from "@/components/profile/badges-panel"
import { ForkBadge } from "@/components/project/fork-badge"
import type { ProjectFeedItem } from "@/lib/public-project"

function formatCardDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ExploreCard({
  project,
  loggedIn,
  username,
  interactive = true,
  loading,
}: {
  project: ProjectFeedItem
  loggedIn: boolean
  username: string | null
  interactive?: boolean
  loading?: "eager" | "lazy"
}) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:justify-between gap-5 rounded-lg border border-border bg-popover p-6 transition-shadow hover:shadow-elevation-1">
      {interactive && (
        <Link href={`/p/${project.id}`} className="absolute inset-0 z-0" aria-label={project.title} />
      )}

      <div className="min-w-0 w-full">
        <div className="flex items-center gap-2.5 text-[0.8125rem] text-muted-foreground mb-3">
          {interactive ? (
            <ProfileHoverCard username={project.ownerUsername} avatar={project.ownerAvatar} isLoggedIn={loggedIn} viewerUsername={username}>
              <span className="relative z-10 flex items-center gap-2.5">
                <AuthorAvatar username={project.ownerUsername} avatar={project.ownerAvatar} />
                <span className="flex items-center gap-1">
                  <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="inline-flex min-h-6 items-center font-medium text-foreground hover:underline">
                    {project.ownerUsername}
                  </Link>
                  <NameBadge code={project.ownerBadge} />
                </span>
              </span>
            </ProfileHoverCard>
          ) : (
            <span className="flex items-center gap-2.5">
              <AuthorAvatar username={project.ownerUsername} avatar={project.ownerAvatar} />
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{project.ownerUsername}</span>
                <NameBadge code={project.ownerBadge} />
              </span>
            </span>
          )}
          {project.publishedDate && (
            <span>
              Published {formatCardDate(project.publishedDate)}
              {project.lastPublishedDate && ` · Updated ${formatCardDate(project.lastPublishedDate)}`}
            </span>
          )}
        </div>
        {project.forkedFromOwnerUsername && (
          <div className="mb-2">
            <ForkBadge
              forkedFromProjectId={project.forkedFromProjectId}
              forkedFromTitle={project.forkedFromTitle}
              forkedFromOwnerUsername={project.forkedFromOwnerUsername}
              isLoggedIn={loggedIn}
              viewerUsername={username}
              hoverCard={interactive}
            />
          </div>
        )}
        <div className="mb-2 font-display text-[1.375rem] font-medium leading-[1.25]">
          {project.title}
        </div>
        {project.description && (
          <p className="mb-3.5 text-[0.9375rem] leading-[1.6] text-muted-foreground max-w-[70ch] line-clamp-2">
            {project.description}
          </p>
        )}

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm border border-border px-3 py-[5px] text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {interactive && <div className="flex justify-between mt-3.5">
          <div className="flex items-center gap-3.5">
            <VoteButton
              projectId={project.id}
              initialVoted={project.votedByRequester}
              initialCount={project.voteCount}
              isLoggedIn={loggedIn}
            />
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
              <Eye className="h-[17px] w-[17px]" />
              {project.viewCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
              <MessageCircle className="h-[15px] w-[15px]" />
              {project.commentCount.toLocaleString('en-US')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <BookmarkButton
              projectId={project.id}
              initialBookmarked={project.bookmarkedByRequester}
              isLoggedIn={loggedIn}
            />
            <PostOptionsMenu
              projectId={project.id}
              ownerUsername={project.ownerUsername}
              isLoggedIn={loggedIn}
              isOwnPost={project.ownerUsername === username}
              canFork={project.canFork}
            />
          </div>
        </div>}
      </div>
      <div className="flex items-center gap-4 sm:shrink-0 sm:self-center">
        <ProjectThumbnail
          thumbnailImageUrl={project.thumbnailImageUrl}
          loading={loading}
          title={project.title}
          className="pointer-events-none rounded-lg w-full h-[180px] sm:w-[156px] sm:h-[128px] bg-surface-container-high"
        />
      </div>
    </div>
  )
}
