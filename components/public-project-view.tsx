"use client"

import { useState } from "react"
import { FolderPlus } from "lucide-react"

import { PublicSidebar } from "@/components/public-sidebar"
import { LexicalReadOnly } from "@/components/lexical-read-only"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { VoteButton } from "@/components/vote-button"
import { ForkButton } from "@/components/fork-button"
import type { PublicIdea, PublicProject } from "@/lib/public-project"

export function PublicProjectView({
  project,
  homeHref,
  isLoggedIn,
  isOwnProject,
}: {
  project: PublicProject
  homeHref: string
  isLoggedIn: boolean
  isOwnProject: boolean
}) {
  const allIdeas = project.paths.flatMap((path) => path.ideas)
  const [selectedIdea, setSelectedIdea] = useState<PublicIdea | undefined>(allIdeas[0])

  const handleIdeaLinkClick = (ideaId: string) => {
    const idea = allIdeas.find((candidate) => candidate.id === ideaId)
    if (idea) setSelectedIdea(idea)
  }

  return (
    <>
      <PublicSidebar
        paths={project.paths}
        selectedIdeaId={selectedIdea?.id}
        onSelectIdea={setSelectedIdea}
        homeHref={homeHref}
      />
      <SidebarInset>
        <header
          className="flex h-16 shrink-0 items-center gap-4 px-8"
          style={{ borderBottom: "2px solid var(--color-divider)" }}
        >
          <SidebarTrigger />
          <div>
            <span className="text-[15px] font-bold">{project.title}</span>
            <span className="ml-2 text-xs" style={{ color: "var(--color-neutral-600)" }}>
              by {project.ownerUsername}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!isOwnProject && <ForkButton projectId={project.id} isLoggedIn={isLoggedIn} />}
            <VoteButton
              projectId={project.id}
              initialVoted={project.votedByRequester}
              initialCount={project.voteCount}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </header>
        <div className="flex-1 overflow-auto px-2 py-2">
          {selectedIdea ? (
            <div className="mx-auto flex max-w-[820px] flex-col gap-4 px-6 py-8">
              <h1 className="text-[28px] font-bold" style={{ letterSpacing: "-0.01em" }}>
                {selectedIdea.title}
              </h1>
              <LexicalReadOnly content={selectedIdea.content} onIdeaClick={handleIdeaLinkClick} />
            </div>
          ) : (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <FolderPlus className="h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">This project has no published content yet</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </>
  )
}
