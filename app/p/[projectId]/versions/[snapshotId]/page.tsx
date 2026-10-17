// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPublicProjectSnapshot } from "@/lib/project-snapshots"
import { PublicProjectView } from "@/components/project/public-project-view"
import { getPublicProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"

export const metadata: Metadata = {
  title: "Older version",
  robots: { index: false, follow: false },
}

export default async function PublicVersionPage({
  params,
}: {
  params: Promise<{ projectId: string; snapshotId: string }>
}) {
  const { projectId, snapshotId } = await params
  const [snapshot, project, homeHref, loggedIn, username] = await Promise.all([
    getPublicProjectSnapshot(projectId, snapshotId),
    getPublicProject(projectId),
    getHomeHref(),
    isLoggedIn(),
    getUsername(),
  ])

  if (!snapshot || !project) {
    notFound()
  }

  const profile = loggedIn ? await getMyProfile() : null

  return (
    <PublicProjectView
      project={{ ...project, title: snapshot.title, description: snapshot.description, trails: snapshot.trails, looseItems: snapshot.looseItems }}
      snapshot={{ id: snapshot.id, version: snapshot.version, createdAt: snapshot.createdAt }}
      homeHref={homeHref}
      isLoggedIn={loggedIn}
      isOwnProject={!!username && username === project.ownerUsername}
      username={profile?.username ?? null}
      imageUrl={profile?.imageUrl ?? null}
    />
  )
}
