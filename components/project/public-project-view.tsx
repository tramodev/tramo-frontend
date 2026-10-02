"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Eye, FolderPlus, ListTree, MessageCircle, Route } from "lucide-react"

import { PublicSidebar } from "@/components/project/public-sidebar"
import { LexicalReadOnly } from "@/components/project/lexical-read-only"
import { ProjectShell } from "@/components/editor/project-shell"
import { TrailConnector } from "@/components/editor/trail-connector"
import { GraphView } from "@/components/editor/graph-view"
import { OverviewView } from "@/components/editor/overview-view"
import { VoteButton } from "@/components/social/vote-button"
import { ForkButton } from "@/components/social/fork-button"
import { BookmarkButton } from "@/components/social/bookmark-button"
import { AuthPromptActions } from "@/components/auth/auth-prompt-actions"
import { ReportButton } from "@/components/social/report-button"
import { ShareToFollowersButton } from "@/components/social/share-to-followers-button"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"
import { CommentsSection } from "@/components/project/comments-section"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import type { PublicItem, PublicProject } from "@/lib/public-project"
import type { Association, Item, Trail } from "@/app/editor/types"
import { firstReadableTrail, resolveItemTrail } from "@/app/editor/trail-navigation"
import { bridgeTies } from "@/app/editor/associations"
import { useScrollSpy } from "@/hooks/use-scroll-spy"

function toEditorShape(project: PublicProject): { trails: Trail[]; items: Record<string, Item> } {
  const items: Record<string, Item> = {};
  const addItem = (item: PublicItem, unfiled: boolean) => {
    items[item.id] = {
      id: item.id,
      title: item.title,
      titleAlign: item.titleAlign,
      unfiled,
      content: item.content,
      associations: item.associations,
      linkedItemIds: item.associations.filter((a) => a.targetType === "ITEM").map((a) => a.targetId),
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
        annotation: item.annotation,
        associationId: item.associationId,
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
  const [view, setView] = useState<'content' | 'overview' | 'graph'>('content')
  const [commentCount, setCommentCount] = useState(project.commentCount)

  const { trails, items } = useMemo(() => toEditorShape(project), [project])

  const activeTrail = useMemo(() => trails.find((t) => t.id === activeTrailId), [trails, activeTrailId])

  const associationById = useMemo(() => {
    const map = new Map<string, Association>();
    Object.values(items).forEach((it) => it.associations.forEach((a) => map.set(a.id, a)));
    return map;
  }, [items])

  const inTrail = !!(selectedItem && activeTrail?.itemIds.includes(selectedItem.id))
  const steps = inTrail && activeTrail
    ? activeTrail.steps
    : selectedItem
      ? [{ itemId: selectedItem.id, annotation: null, associationId: null }]
      : []
  const stacked = steps.length > 1

  const columnRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const shouldScrollRef = useRef(false)

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
    ids: steps.map((step) => step.itemId),
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

  const handleSelectMappedItem = (item: Item) => {
    const original = allItems.find((candidate) => candidate.id === item.id)
    if (original) handleSelectItem(original)
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
          {allItems.length > 0 && (
            <Button
              variant={view === 'graph' ? 'secondary' : 'ghost'}
              size="lg"
              onClick={() => setView((v) => (v === 'graph' ? 'content' : 'graph'))}
              title="See this project as a graph"
            >
              <ListTree className="h-[15px] w-[15px]" />
              Graph
            </Button>
          )}
          {activeTrail && (
            <Button
              variant={view === 'overview' ? 'secondary' : 'ghost'}
              size="lg"
              onClick={() => setView((v) => (v === 'overview' ? 'content' : 'overview'))}
              title="See the whole trail at a glance"
            >
              <Route className="h-[15px] w-[15px]" />
              Overview
            </Button>
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
        />
      }
      content={
        <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
          {view === 'graph' ? (
            <GraphView
              trails={trails}
              items={items}
              activeTrailId={activeTrailId}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectMappedItem}
              onClose={() => setView('content')}
            />
          ) : view === 'overview' ? (
            <OverviewView
              trail={activeTrail}
              items={items}
              associationById={associationById}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectMappedItem}
              onClose={() => setView('content')}
              emptyState={emptyState}
            />
          ) : (
            <div ref={columnRef} className="flex min-w-0 flex-1 flex-col gap-3 overflow-auto">
              <section aria-label="About this project" className="rounded-2xl bg-popover">
                <div className="mx-auto w-full max-w-[1024px] px-6 py-6">
                  <div className="pl-7">
                  <h1 className="font-display text-3xl font-medium">{project.title}</h1>
                  {project.description?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>}
                  {project.trails.length > 0 && <><p className="mt-5 text-xs text-muted-foreground">Trails are ordered sequences of notes. Choose where to begin.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{project.trails.map(trail => <button type="button" key={trail.id} aria-pressed={activeTrailId === trail.id} onClick={() => handleSelectTrail(trail.id)} className={`rounded-lg border p-3 text-left ${activeTrailId === trail.id ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`}><span className="block text-sm font-medium">{trail.title}</span>{trail.description?.trim() && <span className="mt-1 block text-xs text-muted-foreground">{trail.description}</span>}<span className="mt-1 block text-xs text-muted-foreground">{trail.items.length} notes</span></button>)}</div></>}
                  {project.looseItems.length > 0 && <button type="button" className="mt-3 text-sm underline" onClick={() => { setActiveTrailId(undefined); setSelectedItem(project.looseItems[0]); }}>Notes outside trails</button>}
                  </div>
                </div>
              </section>
              {selectedItem ? (
                <div className="rounded-2xl bg-popover">
                  <div className="public-trail-column mx-auto w-full max-w-[1024px] px-6 py-8">
                    {steps.map((step, i) => {
                      const stepItem = items[step.itemId]
                      if (!stepItem) return null
                      const isActive = step.itemId === selectedItem.id
                      const ties = i > 0 ? bridgeTies(items, steps[i - 1].itemId, step.itemId) : []
                      const explicit = step.associationId ? associationById.get(step.associationId) : undefined
                      if (explicit && !ties.some((t) => t.association.id === explicit.id)) {
                        ties.unshift({ association: explicit, forward: true, sourceTitle: Object.values(items).find(note => note.associations.some(a => a.id === explicit.id))?.title })
                      }

                      return (
                        <div
                          key={step.itemId}
                          tabIndex={-1}
                          aria-label={stepItem.title}
                          ref={(el) => {
                            if (el) slotRefs.current.set(step.itemId, el)
                            else slotRefs.current.delete(step.itemId)
                          }}
                        >
                          {i > 0 && (
                            <div className="trail-divider mt-4">
                              <TrailConnector ties={ties} annotation={step.annotation} />
                            </div>
                          )}
                          <div
                            onClick={(e) => {
                              if (isActive) return
                              if ((e.target as HTMLElement).closest('a')) return
                              const target = allItems.find((candidate) => candidate.id === step.itemId)
                              if (target) setSelectedItem(target)
                            }}
                            className={stacked && !isActive ? 'group cursor-pointer' : undefined}
                          >
                            {stacked && (
                              <div
                                className={`flex items-center gap-2 pl-7 pt-6 text-[11px] font-medium uppercase tracking-[0.1em] ${
                                  isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                }`}
                              >
                                <span
                                  className={
                                    isActive
                                      ? 'h-[7px] w-[7px] shrink-0 rounded-full bg-primary'
                                      : 'h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-muted-foreground box-border group-hover:border-primary'
                                  }
                                />
                                Step {i + 1}
                              </div>
                            )}
                            <h1
                              className={`font-display text-[28px] font-medium ${stacked ? 'pl-7 pt-1' : 'pl-7'}`}
                              style={{ textAlign: stepItem.titleAlign }}
                            >
                              {stepItem.title}
                            </h1>
                            <LexicalReadOnly
                              key={step.itemId}
                              content={stepItem.content ?? ''}
                              onItemClick={handleItemLinkClick}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : emptyState}
              <div className="mt-8 border-t border-border">
                <CommentsSection projectId={project.id} projectTitle={project.title} isLoggedIn={isLoggedIn} username={username} commentCount={commentCount} onCommentCountChange={setCommentCount} canComment={project.canComment} />
              </div>
            </div>
          )}
        </div>
      }
    />
  )
}
