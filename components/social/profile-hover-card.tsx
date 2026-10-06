// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import Link from "next/link"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { AuthorAvatar } from "@/components/shared/author-avatar"
import { NameBadge } from "@/components/profile/badges-panel"
import { FollowButton } from "@/components/social/follow-button"
import { getPublicProfile, type PublicProfile } from "@/lib/public-profile"

const profileCache = new Map<string, PublicProfile | null>()

export function ProfileHoverCard({
  username,
  avatar,
  isLoggedIn,
  viewerUsername,
  children,
}: {
  username: string
  avatar: string | null
  isLoggedIn: boolean
  viewerUsername: string | null
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(profileCache.get(username))
  const [loading, setLoading] = useState(false)

  function handleOpenChange(open: boolean) {
    if (!open || profile !== undefined || loading) return
    setLoading(true)
    getPublicProfile(username).then((result) => {
      profileCache.set(username, result)
      setProfile(result)
      setLoading(false)
    })
  }

  return (
    <HoverCard onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        {profile === undefined || loading ? (
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : profile === null ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load profile.</p>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-2">
              <Link href={`/u/${encodeURIComponent(username)}`}>
                <AuthorAvatar username={username} avatar={profile.imageUrl ?? avatar} size={64} />
              </Link>
              {!profile.self && username !== viewerUsername && (
                <FollowButton username={username} initialFollowing={profile.following} isLoggedIn={isLoggedIn} />
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-1">
              <Link href={`/u/${encodeURIComponent(username)}`} className="font-medium hover:underline">
                {username}
              </Link>
              <NameBadge code={profile.selectedBadge} size={12} />
            </div>
            {profile.bio && (
              <p className="mt-1 text-sm leading-[1.5] text-muted-foreground line-clamp-3">{profile.bio}</p>
            )}
            <div className="mt-2.5 flex items-center gap-3 text-[13px]">
              <span>
                <span className="font-medium text-foreground">{profile.stats.followersCount.toLocaleString('en-US')}</span>{" "}
                <span className="text-muted-foreground">followers</span>
              </span>
              <span>
                <span className="font-medium text-foreground">{profile.stats.followingCount.toLocaleString('en-US')}</span>{" "}
                <span className="text-muted-foreground">following</span>
              </span>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
