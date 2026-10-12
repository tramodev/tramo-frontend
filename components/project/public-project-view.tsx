// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Eye, FolderPlus, MessageCircle } from "lucide-react"

import { PublicSidebar } from "@/components/project/public-sidebar"
import { EditorImagesProvider } from "@/components/editor/editor-images-provider"
import { LexicalReadOnly } from "@/components/project/lexical-read-only"
import { ProjectShell } from "@/components/editor/project-shell"
import { TrailConnector } from "@/components/editor/trail-connector"
import { NextTrailButton } from "@/components/editor/next-trail-button"
import { GraphView } from "@/components/editor/graph-view"
import { ConnectionsPanel } from "@/components/editor/connections-panel"
import { VoteButton } from "@/components/social/vote-button"
import { ForkButton } from "@/components/social/fork-button"
import { BookmarkButton } from "@/components/social/bookmark-button"
import { AuthPromptActions } from "@/components/auth/auth-prompt-actions"
import { ReportButton } from "@/components/social/report-button"
import { ShareToFollowersButton } from "@/components/social/share-to-followers-button"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"
import { CommentsSection } from "@/components/project/comments-section"
import { UserMenu } from "@/components/layout/user-menu"
import type { PublicItem, PublicProject } from "@/lib/public-project"
import type { Item, Trail } from "@/app/editor/types"
import { firstReadableTrail, resolveItemTrail } from "@/app/editor/trail-navigation"
import { useScrollSpy } from "@/hooks/use-scroll-spy"
import { useVirtualNotes } from "@/app/editor/[projectId]/hooks/useVirtualNotes"

function toEditorShape(project: PublicProject): { trails: Trail[]; items: Record<string, Item> } {
  const items: Record<string, Item> = {};
  const addItem = (item: PublicItem, unfiled: boolean) => {
    items[item.id] = {
      id: item.id,
      title: item.title,
      titleAlign: item.titleAlign,
      unfiled,
      content: item.content,
    };
  };
  project.looseItems.forEach((item) => addItem(item, true));
  const trails: Trail[] = project.trails.map((trail) => {
    trail.items.forEach((item) => addItem(item, false));
    return {
      id: trail.id,
      title: trail.title,
      description: trail.description,
      itemIds: trail.items.map((item) => item.id),
      steps: trail.items.map((item) => ({
        itemId: item.id,
      })),
      version: trail.version,
      forkedFrom: trail.forkedFromId,
    };
  });
  return { trails, items };
}

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
  const allItems = [...project.trails.flatMap((trail) => trail.items), ...project.looseItems]
  const firstTrail = firstReadableTrail(project.trails)
  const [selectedItem, setSelectedItem] = useState<PublicItem | undefined>(firstTrail?.items[0] ?? project.looseItems[0])
  const [activeTrailId, setActiveTrailId] = useState<string | undefined>(firstTrail?.id)
  const [view, setView] = useState<'content' | 'graph'>('content')
  const [commentCount, setCommentCount] = useState(project.commentCount)
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false)

  const { trails, items } = useMemo(() => toEditorShape(project), [project])

  const activeTrail = useMemo(() => trails.find((t) => t.id === activeTrailId), [trails, activeTrailId])



  const inTrail = !!(selectedItem && activeTrail?.itemIds.includes(selectedItem.id))
  const nextTrail = inTrail && activeTrail ? trails[trails.findIndex(trail => trail.id === activeTrail.id) + 1] : undefined
  const steps = useMemo(() => inTrail && activeTrail
    ? activeTrail.steps
    : selectedItem
      ? [{ itemId: selectedItem.id }]
      : [], [inTrail, activeTrail, selectedItem])
  const ids = useMemo(() => steps.map(step => step.itemId), [steps])
  const stacked = steps.length > 1

  const columnRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef(new Map<string, HTMLElement>())
  const shouldScrollRef = useRef(false)
  const { visibleIds, selectionIds, heights } = useVirtualNotes(columnRef, slotRefs, ids, view === 'content')

  useEffect(() => {
    const el = columnRef.current
    if (!el || !selectedItem || !shouldScrollRef.current) return
    shouldScrollRef.current = false
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const slot = slotRefs.current.get(selectedItem.id)
      if (slot && stacked) slot.scrollIntoView({ block: 'start' })
      else el.scrollTop = 0
    }))
  }, [selectedItem, stacked])

  useScrollSpy({
    root: columnRef,
    slots: slotRefs,
    ids,
    enabled: stacked && view === 'content',
    onVisible: (itemId) => {
      if (itemId === selectedItem?.id) return
      const item = allItems.find((candidate) => candidate.id === itemId)
      if (item) setSelectedItem(item)
    },
  })

  const handleSelectItem = (item: PublicItem, trailId?: string) => {
    shouldScrollRef.current = true
    setSelectedItem(item)
    setView('content')
    setActiveTrailId(prev => resolveItemTrail(trails, item.id, prev, trailId))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const slot = slotRefs.current.get(item.id)
      slot?.scrollIntoView({ block: 'start' })
      slot?.focus({ preventScroll: true })
    }))
  }

  const handleSelectTrail = (id: string) => {
    const trail = project.trails.find(candidate => candidate.id === id)
    if (!trail) return
    setActiveTrailId(id)
    setSelectedItem(trail.items[0])
    setView('content')
    shouldScrollRef.current = false
    columnRef.current?.scrollTo({ top: 0 })
  }

  const handleSelectMappedItem = (item: Item, trailId?: string) => {
    const original = allItems.find((candidate) => candidate.id === item.id)
    if (original) handleSelectItem(original, trailId)
  }

  const handleItemLinkClick = (itemId: string) => {
    const item = allItems.find((candidate) => candidate.id === itemId)
    if (item) handleSelectItem(item)
  }

  const emptyState = (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
      <FolderPlus className="h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">{activeTrail ? 'This trail has no notes yet' : 'This project has no published notes yet'}</p>
    </div>
  )

  return (
    <EditorImagesProvider projectId={project.id} publicRead={true}>
    <ProjectShell
      homeHref={homeHref}
      showLogo={false}
      titleSlot={
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-[15px] font-medium">{project.title}</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            by{" "}
            <ProfileHoverCard
              username={project.ownerUsername}
              avatar={null}
              isLoggedIn={isLoggedIn}
              viewerUsername={username}
            >
              <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="font-medium hover:text-primary">
                {project.ownerUsername}
              </Link>
            </ProfileHoverCard>
            {project.forkedFromOwnerUsername && (
              <>
                {" "}
                forked from{" "}
                <ProfileHoverCard
                  username={project.forkedFromOwnerUsername}
                  avatar={null}
                  isLoggedIn={isLoggedIn}
                  viewerUsername={username}
                >
                  <Link
                    href={`/u/${encodeURIComponent(project.forkedFromOwnerUsername)}`}
                    className="font-medium hover:text-primary"
                  >
                    @{project.forkedFromOwnerUsername}
                  </Link>
                </ProfileHoverCard>
              </>
            )}
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Eye className="h-3.5 w-3.5" />
            {project.viewCount} views
          </span>
        </div>
      }
      actions={
        <>
          {view === 'content' && (
            <a
              href="#comments"
              title="Jump to project comments"
              className="relative z-10 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount}
            </a>
          )}
          {isLoggedIn ? (
            <>
              {!isOwnProject && <ReportButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              {!isOwnProject && project.canFork && <ForkButton projectId={project.id} isLoggedIn={isLoggedIn} />}
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
          homeHref={homeHref}
          trails={project.trails}
          looseItems={project.looseItems}
          selectedItemId={selectedItem?.id}
          onSelectItem={handleSelectItem}
          activeTrailId={activeTrailId}
          onSelectTrail={handleSelectTrail}
        />
      }
      content={
        <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
          {view === 'graph' ? (
            <GraphView
              trails={trails}
              items={items}
              activeTrailId={activeTrailId}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectMappedItem}
              onClose={() => setView('content')}
            />
          ) : (
            <div className="editor-container flex min-h-0 min-w-0 flex-1 flex-col">
              <div ref={columnRef} className="editor-inner">
                <div className="editor-content-column">
                  <section aria-label="About this project" className="border-b border-border py-6 pl-7">
                    <h1 className="font-display text-3xl font-medium">{project.title}</h1>
                    {project.description?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>}
                  </section>
                  {activeTrail && <section aria-label="Current trail" className="pl-7 pt-6">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h2 className="text-sm font-medium">{activeTrail.title}</h2>
                      <span className="text-xs text-muted-foreground">· {activeTrail.itemIds.length} {activeTrail.itemIds.length === 1 ? 'note' : 'notes'}</span>
                    </div>
                    {activeTrail.description?.trim() && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{activeTrail.description}</p>}
                  </section>}
                  {selectedItem ? steps.map((step, i) => {
                    const stepItem = items[step.itemId]
                    if (!stepItem) return null
                    const isActive = step.itemId === selectedItem.id
                    const mounted = isActive || visibleIds.has(step.itemId) || selectionIds.has(step.itemId)

                    return (
                      <section
                        key={step.itemId}
                        data-item-id={step.itemId}
                        data-mounted={mounted}
                        style={mounted ? undefined : { height: heights.get(step.itemId) ?? 240, overflow: 'hidden' }}
                        tabIndex={-1}
                        aria-label={`Step ${i + 1}: ${stepItem.title}`}
                        ref={(el) => {
                          if (el) slotRefs.current.set(step.itemId, el)
                          else slotRefs.current.delete(step.itemId)
                        }}
                      >
                        {i > 0 && <div className="trail-divider mt-4"><TrailConnector /></div>}
                        <div
                          onClick={(e) => {
                            if (isActive) return
                            if ((e.target as HTMLElement).closest('a')) return
                            const target = allItems.find((candidate) => candidate.id === step.itemId)
                            if (target) setSelectedItem(target)
                          }}
                          className={stacked && !isActive ? 'group cursor-pointer' : undefined}
                        >
                          <div className={`pl-7 pt-6 text-[11px] font-medium uppercase tracking-[0.1em] ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            Step {i + 1}
                          </div>
                          <h2 className="pl-7 pt-2 font-display text-[28px] font-medium leading-normal" style={{ textAlign: stepItem.titleAlign }}>
                            {stepItem.title}
                          </h2>
                          {mounted && <LexicalReadOnly key={step.itemId} content={stepItem.content ?? ''} onItemClick={handleItemLinkClick} />}
                        </div>
                        {i === steps.length - 1 && nextTrail && <NextTrailButton trail={nextTrail} onSelectTrail={handleSelectTrail} />}
                      </section>
                    )
                  }) : emptyState}
                  <div className="mt-8 border-t border-border">
                    <CommentsSection projectId={project.id} projectTitle={project.title} isLoggedIn={isLoggedIn} username={username} commentCount={commentCount} onCommentCountChange={setCommentCount} canComment={project.canComment} />
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === 'content' && selectedItem && <ConnectionsPanel
            item={items[selectedItem.id]}
            items={items}
            trails={trails}
            activeTrailId={activeTrailId}
            onSelectItem={handleSelectMappedItem}
            onOpenGraph={() => setView('graph')}
            open={connectionsPanelOpen}
            onToggleOpen={() => setConnectionsPanelOpen(open => !open)}
            readOnly
          />}
        </div>
      }
    />
    </EditorImagesProvider>
  )
}
