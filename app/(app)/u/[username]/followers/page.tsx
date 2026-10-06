// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FollowListPanel } from "@/components/profile/follow-list-panel"
import { getUsername, isLoggedIn } from "@/lib/auth"
import { getPublicProfile, getFollowersPage, getFollowingPage } from "@/lib/public-profile"
import { PAGE_SIZE } from "@/lib/config"

type Tab = "followers" | "following"

const fetchProfile = cache(getPublicProfile)

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}): Promise<Metadata> {
  const { username } = await params
  const { tab: tabParam } = await searchParams
  const profile = await fetchProfile(username)
  if (!profile) return { title: "User not found" }
  return { title: `${profile.username}'s ${tabParam === "following" ? "following" : "followers"}` }
}

export default async function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { username } = await params
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === "following" ? "following" : "followers"

  const [profile, loggedIn, currentUsername] = await Promise.all([
    fetchProfile(username),
    isLoggedIn(),
    getUsername(),
  ])

  if (!profile) {
    notFound()
  }

  const { items, hasMore } =
    tab === "followers" ? await getFollowersPage(username, 0, PAGE_SIZE) : await getFollowingPage(username, 0, PAGE_SIZE)

  return (
    <main className="mx-auto w-full flex-1 max-w-[720px] px-4 sm:px-8 py-9">
      <h1 className="mb-6 font-display text-2xl font-medium">{profile.username}</h1>
      <div className="flex gap-1 border-b border-border mb-4">
        {(["followers", "following"] as Tab[]).map((key) => (
          <Link
            key={key}
            href={`/u/${encodeURIComponent(username)}/followers?tab=${key}`}
            className={`relative inline-flex items-baseline gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
              tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "followers"
              ? `${profile.stats.followersCount.toLocaleString('en-US')} Followers`
              : `${profile.stats.followingCount.toLocaleString('en-US')} Following`}
            {tab === key && (
              <span className="absolute inset-x-4 -bottom-px h-[3px] rounded-t-[3px] bg-primary" />
            )}
          </Link>
        ))}
      </div>
      <FollowListPanel
        key={tab}
        username={username}
        mode={tab}
        initialItems={items}
        initialHasMore={hasMore}
        loggedIn={loggedIn}
        currentUsername={currentUsername}
        pageSize={PAGE_SIZE}
        emptyMessage={
          tab === "followers"
            ? `${profile.username} doesn't have any followers yet.`
            : `${profile.username} isn't following anyone yet.`
        }
      />
    </main>
  )
}
