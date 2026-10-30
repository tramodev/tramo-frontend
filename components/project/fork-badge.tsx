// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from "next/link"
import { GitFork } from "lucide-react"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"

export function ForkBadge({
  forkedFromProjectId,
  forkedFromTitle,
  forkedFromOwnerUsername,
  iconOnly = false,
  isLoggedIn = false,
  viewerUsername = null,
  hoverCard = true,
}: {
  forkedFromProjectId: string | null
  forkedFromTitle: string | null
  forkedFromOwnerUsername: string | null
  iconOnly?: boolean
  isLoggedIn?: boolean
  viewerUsername?: string | null
  hoverCard?: boolean
}) {
  if (!forkedFromProjectId || !forkedFromOwnerUsername) return null

  if (iconOnly) {
    return (
      <Link
        href={`/p/${encodeURIComponent(forkedFromProjectId)}`}
        title={`Forked from ${forkedFromTitle ?? "Original project"} by @${forkedFromOwnerUsername}`}
        className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"
      >
        <GitFork className="h-3 w-3" />
      </Link>
    )
  }

  const usernameLink = (
    <Link href={`/u/${encodeURIComponent(forkedFromOwnerUsername)}`} className="shrink-0 hover:underline">
      @{forkedFromOwnerUsername}
    </Link>
  )

  return (
    <span className="relative z-10 inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <GitFork className="h-3 w-3 shrink-0" />
      Forked from{" "}
      <Link href={`/p/${encodeURIComponent(forkedFromProjectId)}`} title={forkedFromTitle ?? "Original project"} className="min-w-0 truncate hover:underline">
        {forkedFromTitle ?? "Original project"}
      </Link>
      {" by "}
      {hoverCard ? (
        <ProfileHoverCard username={forkedFromOwnerUsername} avatar={null} isLoggedIn={isLoggedIn} viewerUsername={viewerUsername}>
          {usernameLink}
        </ProfileHoverCard>
      ) : (
        usernameLink
      )}
    </span>
  )
}
