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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RestoreProjectVersionButton } from "@/components/project/restore-project-version-button"
import type { HistoryVersion } from "@/lib/project-history"
import type { ProjectSnapshotSummary } from "@/lib/project-snapshots"
import type { PublicItem, PublicProject } from "@/lib/public-project"
import type { Item, Trail } from "@/app/editor/types"
import { useMounted } from "@/hooks/use-mounted"
import { useScrollSpy } from "@/hooks/use-scroll-spy"
import { useVirtualNotes } from "@/app/editor/[projectId]/hooks/useVirtualNotes"

type ReaderProject = Pick<PublicProject, 'id' | 'title' | 'description' | 'ownerUsername' | 'trails' | 'looseItems'>

function toEditorShape(project: ReaderProject): { trails: Trail[]; items: Record<string, Item> } {
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
  snapshot,
  historyVersion,
}: {
  project: ReaderProject | PublicProject
  homeHref: string
  isLoggedIn: boolean
  isOwnProject: boolean
  username: string | null
  imageUrl: string | null
  snapshot?: ProjectSnapshotSummary
  historyVersion?: HistoryVersion & { restoreEpoch: number }
}) {
  const publicProject = historyVersion ? null : project as PublicProject
  const historical = Boolean(snapshot || historyVersion)
  const mounted = useMounted()
  const sections = useMemo(() => [
    ...project.trails.map(trail => ({ id: `trail:${trail.id}`, trailId: trail.id, title: trail.title, description: trail.description, items: trail.items })),
    ...(project.looseItems.length ? [{ id: 'loose', trailId: undefined, title: 'Notes without a trail', description: '', items: project.looseItems }] : []),
  ], [project])
  const entries = useMemo(() => sections.flatMap(section => [
    { id: section.id, section, item: undefined, index: 0 },
    ...section.items.map((item, index) => ({ id: `${section.id}:item:${item.id}`, section, item, index })),
  ]), [sections])
  const [selectedId, setSelectedId] = useState<string | undefined>(entries.find(entry => entry.item)?.id ?? entries[0]?.id)
  const [view, setView] = useState<'content' | 'graph'>('content')
  const [commentCount, setCommentCount] = useState(publicProject?.commentCount ?? 0)
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false)

  const { trails, items } = useMemo(() => toEditorShape(project), [project])

  const selected = entries.find(entry => entry.id === selectedId) ?? entries[0]
  const selectedItem = selected?.item ?? selected?.section.items[0]
  const activeTrailId = selected?.section.trailId
  const ids = useMemo(() => entries.map(entry => entry.id), [entries])
  const noteIds = useMemo(() => entries.filter(entry => entry.item).map(entry => entry.id), [entries])

  const columnRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)
  const stopCommentsScroll = useRef(() => {})
  const slotRefs = useRef(new Map<string, HTMLElement>())
  const { visibleIds, selectionIds, heights } = useVirtualNotes(columnRef, slotRefs, noteIds, view === 'content')

  useScrollSpy({
    root: columnRef,
    slots: slotRefs,
    ids,
    enabled: view === 'content',
    onVisible: setSelectedId,
  })

  useEffect(() => () => stopCommentsScroll.current(), [view])

  const scrollToComments = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const container = columnRef.current
    const comments = commentsRef.current
    if (!container || !comments?.parentElement) return
    event.preventDefault()
    stopCommentsScroll.current()
    const align = () => comments.scrollIntoView({ block: 'start', behavior: 'instant' })
    const observer = new ResizeObserver(align)
    const stop = () => {
      observer.disconnect()
      for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) container.removeEventListener(type, stop)
    }
    stopCommentsScroll.current = stop
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) container.addEventListener(type, stop, { passive: true })
    observer.observe(comments.parentElement)
    align()
    comments.focus({ preventScroll: true })
  }

  const scrollToEntry = (id: string | undefined) => {
    stopCommentsScroll.current()
    setView('content')
    if (!id) return
    setSelectedId(id)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const slot = slotRefs.current.get(id)
      slot?.scrollIntoView({ block: 'start' })
      slot?.focus({ preventScroll: true })
    }))
  }

  const handleSelectItem = (item: Pick<PublicItem, 'id'>, trailId?: string) => {
    const target = entries.find(entry => entry.item?.id === item.id && entry.section.trailId === trailId)
      ?? entries.find(entry => entry.item?.id === item.id)
    if (target) scrollToEntry(target.id)
  }

  const handleSelectTrail = (id: string) => scrollToEntry(`trail:${id}`)

  const handleSelectMappedItem = (item: Item, trailId?: string) => handleSelectItem(item, trailId ?? activeTrailId)

  const emptyState = (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
      <FolderPlus className="h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">{historyVersion ? 'This version has no notes' : 'This project has no published notes yet'}</p>
    </div>
  )

  return (
    <EditorImagesProvider projectId={project.id} publicRead={!historyVersion} snapshotId={snapshot ? Number(snapshot.id) : undefined} versionId={historyVersion?.id}>
    <ProjectShell
      homeHref={homeHref}
      showLogo={false}
      titleSlot={
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-[0.9375rem] font-medium">{project.title}</span>
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
            {publicProject?.forkedFromOwnerUsername && (
              <>
                {" "}
                forked from{" "}
                <ProfileHoverCard
                  username={publicProject?.forkedFromOwnerUsername}
                  avatar={null}
                  isLoggedIn={isLoggedIn}
                  viewerUsername={username}
                >
                  <Link
                    href={`/u/${encodeURIComponent(publicProject?.forkedFromOwnerUsername)}`}
                    className="font-medium hover:text-primary"
                  >
                    @{publicProject?.forkedFromOwnerUsername}
                  </Link>
                </ProfileHoverCard>
              </>
            )}
          </span>
          {!historical && publicProject && <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Eye className="h-3.5 w-3.5" />
            {publicProject.viewCount} {publicProject.viewCount === 1 ? 'view' : 'views'}
          </span>}
        </div>
      }
      actions={
        <>
          {!historical && publicProject && view === 'content' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="#comments"
                  onClick={scrollToComments}
                  aria-label="Jump to project comments"
                  className="relative z-10 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" />
                  {commentCount}
                </a>
              </TooltipTrigger>
              <TooltipContent>Jump to project comments</TooltipContent>
            </Tooltip>
          )}
          {!historical && publicProject && (isLoggedIn ? (
            <>
              {!isOwnProject && <ReportButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              {!isOwnProject && publicProject.canFork && <ForkButton projectId={project.id} isLoggedIn={isLoggedIn} />}
              <ShareToFollowersButton projectId={project.id} isLoggedIn={isLoggedIn} />
              <BookmarkButton
                projectId={project.id}
                initialBookmarked={publicProject.bookmarkedByRequester}
                isLoggedIn={isLoggedIn}
              />
              <VoteButton
                projectId={project.id}
                initialVoted={publicProject.votedByRequester}
                initialCount={publicProject.voteCount}
                isLoggedIn={isLoggedIn}
              />
            </>
          ) : (
            <AuthPromptActions />
          ))}
          {historyVersion && <RestoreProjectVersionButton projectId={project.id} versionId={historyVersion.id} restoreEpoch={historyVersion.restoreEpoch} />}
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
              onClose={() => scrollToEntry(selected?.id)}
            />
          ) : (
            <div className="editor-container flex min-h-0 min-w-0 flex-1 flex-col">
              <div ref={columnRef} className="editor-inner" style={{ paddingInline: 'clamp(12px, 4vw, 48px)' }}>
                <div className="editor-content-column [overflow-wrap:anywhere]">
                  {historyVersion && <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    Preview: {historyVersion.name || historyVersion.type} · <time dateTime={historyVersion.createdAt}>
                      {mounted ? new Date(historyVersion.createdAt).toLocaleString() : historyVersion.createdAt}
                    </time>.{" "}
                    <Link href={`/editor/${project.id}`} className="font-medium text-foreground underline">Back to editor</Link>
                  </div>}
                  {snapshot && <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    You&apos;re viewing Version {snapshot.version} · <time dateTime={snapshot.createdAt}>
                      {mounted ? new Date(snapshot.createdAt).toLocaleString() : snapshot.createdAt}
                    </time>.{" "}
                    <Link href={`/p/${project.id}`} className="font-medium text-foreground underline">
                      See the latest version
                    </Link>
                  </div>}
                  <section aria-label="About this project" className="border-b border-border py-6 pl-7">
                    <h1 className="font-display text-3xl font-medium">{project.title}</h1>
                    {project.description?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>}
                  </section>
                  {entries.map(entry => {
                    const section = entry.section
                    if (!entry.item) return <section
                      key={entry.id}
                      id={entry.id}
                      data-section-id={entry.id}
                      tabIndex={-1}
                      aria-label={section.title}
                      className="pl-7 pt-10 pb-2"
                      ref={el => { if (el) slotRefs.current.set(entry.id, el); else slotRefs.current.delete(entry.id) }}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h2 className="font-display text-2xl font-medium">{section.title}</h2>
                        <span className="text-xs text-muted-foreground">· {section.items.length} {section.items.length === 1 ? 'note' : 'notes'}</span>
                      </div>
                      {section.description?.trim() && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{section.description}</p>}
                      {section.items.length === 0 && <p className="mt-2 text-sm text-muted-foreground">This trail has no notes yet.</p>}
                    </section>
                    const stepItem = entry.item
                    const isActive = selectedItem?.id === stepItem.id && activeTrailId === section.trailId
                    const mounted = isActive || visibleIds.has(entry.id) || selectionIds.has(entry.id)

                    return (
                      <section
                        key={entry.id}
                        id={entry.id}
                        data-item-id={entry.id}
                        data-note-id={stepItem.id}
                        data-trail-id={section.trailId}
                        data-mounted={mounted}
                        style={mounted ? undefined : { height: heights.get(entry.id) ?? 240, overflow: 'hidden' }}
                        tabIndex={-1}
                        aria-label={`${section.title}, note ${entry.index + 1}: ${stepItem.title}`}
                        ref={(el) => {
                          if (el) slotRefs.current.set(entry.id, el)
                          else slotRefs.current.delete(entry.id)
                        }}
                      >
                        {entry.index > 0 && <div className="trail-divider mt-4"><TrailConnector /></div>}
                        <div
                          onClick={(e) => {
                            if (isActive) return
                            if ((e.target as HTMLElement).closest('a')) return
                            setSelectedId(entry.id)
                          }}
                          className={!isActive ? 'group cursor-pointer' : undefined}
                        >
                          <div className={`pl-7 pt-6 text-[0.6875rem] font-medium uppercase tracking-[0.1em] ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            Note {entry.index + 1}
                          </div>
                          <h3 className="pl-7 pt-2 font-display text-[1.75rem] font-medium leading-normal" style={{ textAlign: stepItem.titleAlign }}>
                            {stepItem.title}
                          </h3>
                          {mounted && <LexicalReadOnly content={stepItem.content ?? ''} onItemClick={itemId => handleSelectItem({ id: itemId }, section.trailId)} />}
                        </div>
                      </section>
                    )
                  })}
                  {noteIds.length === 0 && emptyState}
                  {!historical && publicProject && <div ref={commentsRef} tabIndex={-1} className="mt-8 border-t border-border">
                    <CommentsSection projectId={project.id} projectTitle={project.title} isLoggedIn={isLoggedIn} username={username} commentCount={commentCount} onCommentCountChange={setCommentCount} canComment={publicProject.canComment} />
                  </div>}
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
