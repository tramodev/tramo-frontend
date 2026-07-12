import { notFound } from "next/navigation"
import { PublicProjectView } from "@/components/public-project-view"
import { getPublicProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const [project, homeHref, loggedIn, username] = await Promise.all([
    getPublicProject(projectId),
    getHomeHref(),
    isLoggedIn(),
    getUsername(),
  ])

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
    />
  )
}
