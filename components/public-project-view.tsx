"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, FolderPlus, MessageCircle } from "lucide-react"

import { PublicSidebar } from "@/components/public-sidebar"
import { LexicalReadOnly } from "@/components/lexical-read-only"
import { ProjectShell } from "@/components/project-shell"
import { VoteButton } from "@/components/vote-button"
import { ForkButton } from "@/components/fork-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { AuthPromptActions } from "@/components/auth-prompt-actions"
import { ReportButton } from "@/components/report-button"
import { ShareToFollowersButton } from "@/components/share-to-followers-button"
import { CommentsSection } from "@/components/comments-section"
import { UserMenu } from "@/components/user-menu"
import type { PublicItem, PublicProject } from "@/lib/public-project"

export function PublicProjectView({
  project,
  homeHref,
  isLoggedIn,
  isOwnProject,
  username,
  imageUrl,
}: {
  project: PublicProject
  homeHref: string
  isLoggedIn: boolean
  isOwnProject: boolean
  username: string | null
  imageUrl: string | null
}) {
  const allItems = project.trails.flatMap((trail) => trail.items)
  const [selectedItem, setSelectedItem] = useState<PublicItem | undefined>(allItems[0])

  const handleItemLinkClick = (itemId: string) => {
    const item = allItems.find((candidate) => candidate.id === itemId)
    if (item) setSelectedItem(item)
  }

  return (
    <ProjectShell
      homeHref={homeHref}
      titleSlot={
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-[15px] font-medium">{project.title}</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            by{" "}
            <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="font-medium hover:text-primary">
              {project.ownerUsername}
            </Link>
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Eye className="h-3.5 w-3.5" />
            {project.viewCount} views
          </span>
        </div>
      }
      actions={
        <>
          <a
            href="#comments"
            title="Jump to comments"
            className="relative z-10 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            {project.commentCount}
          </a>
          {isLoggedIn ? (
            <>
              {!isOwnProject && <ReportButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              {!isOwnProject && <ForkButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              <ShareToFollowersButton projectId={project.id} isLoggedIn={isLoggedIn} />
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
          {isLoggedIn && <UserMenu loggedIn={isLoggedIn} username={username} imageUrl={imageUrl} />}
        </>
      }
      sidebar={
        <PublicSidebar
          trails={project.trails}
          selectedItemId={selectedItem?.id}
          onSelectItem={setSelectedItem}
        />
      }
      content={
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-auto">
          {selectedItem ? (
            <div className="rounded-2xl bg-popover">
              <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-6 py-8">
                <h1 className="font-display text-[28px] font-medium" style={{ textAlign: selectedItem.titleAlign }}>
                  {selectedItem.title}
                </h1>
                <LexicalReadOnly key={selectedItem.id} content={selectedItem.content} onItemClick={handleItemLinkClick} />
              </div>
            </div>
          ) : (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
              <FolderPlus className="h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">This project has no published content yet</p>
            </div>
          )}
          <div className="rounded-2xl bg-popover">
            <CommentsSection projectId={project.id} isLoggedIn={isLoggedIn} commentCount={project.commentCount} />
          </div>
        </div>
      }
    />
  )
}
