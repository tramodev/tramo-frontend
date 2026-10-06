// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicProjectView } from "@/components/project/public-project-view"
import { getPublicProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"

const fetchProject = cache(getPublicProject)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}): Promise<Metadata> {
  const { projectId } = await params
  const project = await fetchProject(projectId)
  if (!project) return { title: "Project not found" }
  const description = project.description ?? `A trail by ${project.ownerUsername} on Tramo.`
  const images = project.thumbnailImageUrl ? [project.thumbnailImageUrl] : undefined
  return {
    title: project.title,
    description,
    alternates: { canonical: `/p/${projectId}` },
    openGraph: { title: project.title, description, type: "article", images },
    twitter: { card: "summary_large_image", title: project.title, description, images },
    ...(project.visibility !== "published" && { robots: { index: false, follow: false } }),
  }
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const [project, homeHref, loggedIn, username] = await Promise.all([
    fetchProject(projectId),
    getHomeHref(),
    isLoggedIn(),
    getUsername(),
  ])
  const profile = loggedIn ? await getMyProfile() : null

  if (!project) {
    notFound()
  }

  const isOwnProject = !!username && username === project.ownerUsername

  return (
    <PublicProjectView
      project={project}
      homeHref={homeHref}
      isLoggedIn={loggedIn}
      isOwnProject={isOwnProject}
      username={profile?.username ?? null}
      imageUrl={profile?.imageUrl ?? null}
    />
  )
}
