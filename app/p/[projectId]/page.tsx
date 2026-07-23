import { notFound } from "next/navigation"
import { PublicProjectView } from "@/components/project/public-project-view"
import { getPublicProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"

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
