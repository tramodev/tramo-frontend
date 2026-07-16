"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, FolderPlus } from "lucide-react"

import { PublicSidebar } from "@/components/public-sidebar"
import { LexicalReadOnly } from "@/components/lexical-read-only"
import { SidebarInset } from "@/components/ui/sidebar"
import { VoteButton } from "@/components/vote-button"
import { ForkButton } from "@/components/fork-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { AuthPromptActions } from "@/components/auth-prompt-actions"
import { ReportButton } from "@/components/report-button"
import { Wordmark } from "@/components/logo"
import { UserMenu } from "@/components/user-menu"
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
      <header className="flex h-16 shrink-0 items-center gap-4 px-8">
        <Link href={homeHref} title="Back to projects">
          <Wordmark />
        </Link>
        <span className="h-[18px] w-px bg-border" />
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium">{project.title}</span>
          <span className="text-xs text-muted-foreground">
            by{" "}
            <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="font-medium hover:text-primary">
              {project.ownerUsername}
            </Link>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {project.viewCount} views
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {!isOwnProject && <ReportButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              {!isOwnProject && <ForkButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              <BookmarkButton
                projectId={project.id}
                initialBookmarked={project.bookmarkedByRequester}
                isLoggedIn={isLoggedIn}
              />
              <VoteButton
                projectId={project.id}
                initialVoted={project.votedByRequester}
                initialCount={project.voteCount}
                isLoggedIn={isLoggedIn}
              />
            </>
          ) : (
            <AuthPromptActions />
          )}
          {isLoggedIn && <UserMenu />}
        </div>
      </header>
      <div className="relative flex flex-1 min-h-0 transform-gpu">
        <PublicSidebar
          paths={project.paths}
          selectedIdeaId={selectedIdea?.id}
          onSelectIdea={setSelectedIdea}
        />
        <SidebarInset>
          <div className="flex-1 overflow-auto px-2 py-2">
            {selectedIdea ? (
              <div className="mx-auto flex max-w-[820px] flex-col gap-4 px-6 py-8">
                <h1 className="font-display text-[28px] font-medium">
                  {selectedIdea.title}
                </h1>
                <LexicalReadOnly key={selectedIdea.id} content={selectedIdea.content} onIdeaClick={handleIdeaLinkClick} />
              </div>
            ) : (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <FolderPlus className="h-12 w-12 opacity-40" />
                <p className="text-lg font-medium">This project has no published content yet</p>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </>
  )
}
