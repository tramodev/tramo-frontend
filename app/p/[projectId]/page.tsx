import { notFound } from "next/navigation"
import { PublicProjectView } from "@/components/public-project-view"
import { getPublicProject } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const [project, homeHref] = await Promise.all([getPublicProject(projectId), getHomeHref()])

  if (!project) {
    notFound()
  }

  return <PublicProjectView project={project} homeHref={homeHref} />
}
