// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { cache } from "react"
import type { Metadata } from "next"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PublicProjectView } from "@/components/project/public-project-view"
import { getSharedProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"
import { JoinClient } from "./join-client"

const fetchShared = cache(getSharedProject)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token?: string[] }>
}): Promise<Metadata> {
  const { token } = await params
  const project = token?.[0] ? await fetchShared(token[0]) : null
  const robots = { index: false, follow: false }
  if (!project) return { title: "Shared project", robots }
  const description = project.description ?? `A trail by ${project.ownerUsername} on Tramo.`
  return {
    title: project.title,
    description,
    robots,
    openGraph: { title: project.title, description, siteName: "Tramo" },
    twitter: { title: project.title, description },
  }
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token?: string[] }>
}) {
  const { token } = await params
  const shareToken = token?.[0]
  const project = shareToken ? await fetchShared(shareToken) : null
  if (!shareToken || !project) return <JoinClient />

  const [homeHref, loggedIn, username] = await Promise.all([getHomeHref(), isLoggedIn(), getUsername()])
  const profile = loggedIn ? await getMyProfile() : null

  return (
    <div className="contents">
      <SidebarProvider
        style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
        className="h-dvh min-h-0"
      >
        <PublicProjectView
          project={project}
          homeHref={homeHref}
          isLoggedIn={loggedIn}
          isOwnProject={!!username && username === project.ownerUsername}
          username={profile?.username ?? null}
          imageUrl={profile?.imageUrl ?? null}
          shareToken={shareToken}
        />
      </SidebarProvider>
    </div>
  )
}
