// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PublicProjectView } from "@/components/project/public-project-view"
import { getSharedProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"
import { JoinClient } from "./join-client"

export const metadata: Metadata = { title: "Shared project", robots: { index: false, follow: false } }

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token?: string[] }>
}) {
  const { token } = await params
  const shareToken = token?.[0]
  const project = shareToken ? await getSharedProject(shareToken) : null
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
