// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Plus,
  FolderKanban,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  HardDrive,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import { ForkBadge } from "@/components/project/fork-badge"
import { PlanUsageChip } from "@/components/profile/plan-usage-chip"
import { ProjectUsageDialog } from "@/components/project/project-usage-dialog"
import { formatBytes } from "@/lib/format-bytes"
import { PROJECT_TEXT_MAX_LENGTH } from "@/lib/project-validation"
import {
  startProject,
  startExampleProject,
  deleteProject,
  listProjects,
  renameProject,
  type Project,
} from "@/lib/projects-store"

type SortBy = "modified" | "title"
type ViewMode = "grid" | "list"

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ProjectsPage() {
  const router = useRouter()
  const creatingRef = useRef(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [renameError, setRenameError] = useState("")
  const renamingRef = useRef(false)
  const renameAfterClose = useRef<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [usageTarget, setUsageTarget] = useState<Project | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("modified")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  useEffect(() => {
    let cancelled = false
    listProjects().then((loaded) => {
      if (!cancelled) setProjects(loaded)
    }).catch(() => {
      if (!cancelled) setLoadError("Could not load your projects. Please try again.")
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [loadAttempt])

  const sortedProjects = useMemo(() => {
    const copy = [...projects]
    if (sortBy === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    return copy
  }, [projects, sortBy])

  const handleCreateProject = async (example = false) => {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreating(true)
    setCreateError("")
    const key = 'tramo:pending-start:blank'
    const requestId = sessionStorage.getItem(key) ?? crypto.randomUUID()
    if (!example) sessionStorage.setItem(key, requestId)
    try {
      const result = await (example ? startExampleProject() : startProject(requestId))
      if (!example) sessionStorage.removeItem(key)
      router.push(`/editor/${result.projectId}?note=${result.itemId}&trail=${result.trailId ?? ''}&write=1`)
    } catch {
      setCreateError("Could not open your project. Try again; your request will not create a duplicate.")
      creatingRef.current = false
      setCreating(false)
    }
  }

  const startRename = (project: Project) => {
    setRenameError("")
    setEditingId(project.id)
    setEditingTitle(project.title)
  }

  const focusRename = (event: Event) => {
    const project = renameAfterClose.current
    if (!project) return
    event.preventDefault()
    renameAfterClose.current = null
    startRename(project)
  }

  const submitRename = async (projectId: string) => {
    if (editingId !== projectId || renamingRef.current) return
    const title = editingTitle.trim()
    if (!title) { setEditingId(null); return }
    renamingRef.current = true
    try {
      await renameProject(projectId, title, projects.find(project => project.id === projectId)?.restoreEpoch ?? 0)
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, title } : p)))
      setEditingId(null)
      setRenameError("")
    } catch (failure) {
      setRenameError(failure instanceof Error ? failure.message : "Could not rename project. Try again.")
    } finally {
      renamingRef.current = false
    }
  }

  const openInNewTab = (projectId: string) => {
    window.open(`/editor/${projectId}`, "_blank")
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const project = deleteTarget
    setDeleteTarget(null)
    await deleteProject(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
  }

  return (
    <main className="w-full flex-1 pb-[84px]">
      {renameError && <p role="alert" className="px-6 py-3 text-sm text-destructive">{renameError}</p>}
      <section className="bg-surface-container-high pb-8">
        <div className="container-app px-5 py-11 sm:px-10 lg:px-18">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            Your workspace
          </span>
          <PlanUsageChip />
        </div>
        <h1 className="font-display text-[2.75rem] font-normal leading-[1.1] mb-7">
          Start a new project
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            disabled={creating}
            onClick={() => handleCreateProject()}
            className="group flex w-[90%] justify-self-center aspect-[4/5] max-h-[25rem] sm:w-full cursor-pointer flex-col items-start justify-end gap-2 rounded-lg p-5 transition-colors bg-card dark:bg-background border border-dashed border-input text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary"
          >
            <Plus strokeWidth={2} className="h-7 w-7 transition-colors" />
            <span className="text-sm font-medium transition-colors">
              Start writing
            </span>
          </button>
          <button disabled={creating} onClick={() => handleCreateProject(true)} className="flex cursor-pointer w-[90%] justify-self-center aspect-[4/5] max-h-[25rem] sm:w-full flex-col overflow-hidden rounded-lg border border-input bg-card dark:bg-background text-left hover:bg-muted disabled:opacity-50">
            <span className="relative min-h-0 w-full flex-1">
              <Image src="/memex-example.png" alt="Illustration of a wearable camera from Vannevar Bush’s vision" fill sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" className="object-cover" />
            </span>
            <span className="flex shrink-0 flex-col gap-2 p-5">
              <span className="text-sm font-medium">Try an example</span>
              <span className="text-xs text-muted-foreground">Five notes, two trails. Your own editable copy of Memex and Vannevar Bush.</span>
            </span>
          </button>
        </div>
        {creating && <p className="mt-3 text-sm text-muted-foreground" role="status">Opening your first note…</p>}
        {createError && <p className="mt-3 text-sm text-destructive" role="alert">{createError}</p>}

        </div>
      </section>

      <section className="relative -mt-8 rounded-t-[32px] bg-background pt-[34px]">
        <div className="container-app min-h-[310px] px-5 sm:px-10 lg:px-18">
          <div className="mb-5 flex items-center justify-between">
            <span className="block text-sm font-medium text-muted-foreground">My projects</span>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {sortBy === "title" ? "Title" : "Last modified"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSortBy("modified")}>
                    Last modified
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortBy("title")}>
                    Title
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center rounded-md border border-input">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`h-8 w-8 rounded-r-none ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`h-8 w-8 rounded-l-none border-l border-input ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setViewMode("list")}
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading...
            </p>
          ) : loadError ? (
            <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
              {loadError}
              <Button variant="outline" size="sm" onClick={() => {
                setLoadError("")
                setLoading(true)
                setLoadAttempt(attempt => attempt + 1)
              }}>Retry</Button>
            </div>
          ) : sortedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Start writing or try an example.
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedProjects.map((project, index) => (
                <Card
                  key={project.id}
                  className="group/card flex w-[90%] justify-self-center h-[300px] sm:w-full flex-col cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:bg-muted hover:shadow-elevation-1"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <CardContent className="mx-2 mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm p-0">
                    <ProjectThumbnail
                      thumbnailImageUrl={project.thumbnailImageUrl}
                      loading={index < 3 ? "eager" : "lazy"}
                      title={project.title}
                      className="h-full w-full"
                      placeholder={<FolderKanban strokeWidth={1.5} className="h-9 w-9 text-muted-foreground" />}
                    />
                  </CardContent>
                  <CardHeader className="min-w-0 grid-cols-1 shrink-0 gap-0 p-0 py-3 px-4">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      {editingId === project.id ? (
                        <Input
                          autoFocus
                          maxLength={PROJECT_TEXT_MAX_LENGTH}
                          onFocus={(event) => event.currentTarget.select()}
                          value={editingTitle}
                          className="h-7 min-w-0 flex-1"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(project.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          onBlur={() => submitRename(project.id)}
                        />
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <CardTitle
                            className="min-w-0 flex-1 line-clamp-2 break-words text-sm font-medium"
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              startRename(project)
                            }}
                          >
                            {project.title}
                          </CardTitle>
                          {project.forkedFromOwnerUsername && (
                            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <ForkBadge forkedFromOwnerUsername={project.forkedFromOwnerUsername} iconOnly />
                            </span>
                          )}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                            aria-label={`Actions for ${project.title}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onCloseAutoFocus={focusRename}>
                          <DropdownMenuItem onSelect={() => { renameAfterClose.current = project }}>
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openInNewTab(project.id)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open in new tab
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setUsageTarget(project)}>
                            <HardDrive className="h-3.5 w-3.5" />
                            Usage breakdown
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(project)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs tabular-nums mt-1 text-muted-foreground">
                      Edited {formatUpdatedAt(project.updatedAt)} · {formatBytes(project.storageBytes)}
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground">
                <div className="w-12 shrink-0" />
                <div className="min-w-0 flex-1">Title</div>
                <div className="hidden w-28 shrink-0 md:block">Visibility</div>
                <div className="hidden w-32 shrink-0 md:block">Edited</div>
                <div className="w-8 shrink-0" />
              </div>
              {sortedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="relative flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <ProjectThumbnail
                    thumbnailImageUrl={project.thumbnailImageUrl}
                    loading={index < 3 ? "eager" : "lazy"}
                    title={project.title}
                    className="h-12 w-12 shrink-0 rounded-md"
                    placeholder={<FolderKanban strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />}
                  />
                  <div className="min-w-0 flex-1">
                    {editingId === project.id ? (
                      <Input
                        autoFocus
                        maxLength={PROJECT_TEXT_MAX_LENGTH}
                        onFocus={(event) => event.currentTarget.select()}
                        value={editingTitle}
                        className="h-7 max-w-xs"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(project.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        onBlur={() => submitRename(project.id)}
                      />
                    ) : (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <p
                          className="truncate text-sm font-medium"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startRename(project)
                          }}
                        >
                          {project.title}
                        </p>
                        {project.forkedFromOwnerUsername && (
                          <span onClick={(e) => e.stopPropagation()}>
                            <ForkBadge forkedFromOwnerUsername={project.forkedFromOwnerUsername} iconOnly />
                          </span>
                        )}
                      </span>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground md:hidden">
                      <span className="capitalize">{project.visibility}</span> · {formatUpdatedAt(project.updatedAt)} · {formatBytes(project.storageBytes)}
                    </p>
                  </div>
                  <div className="hidden w-28 shrink-0 md:block text-sm capitalize text-muted-foreground">
                    {project.visibility}
                  </div>
                  <div className="hidden w-32 shrink-0 md:block text-xs tabular-nums text-muted-foreground">
                    {formatUpdatedAt(project.updatedAt)} · {formatBytes(project.storageBytes)}
                  </div>
                  <div className="w-8 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                          aria-label={`Actions for ${project.title}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onCloseAutoFocus={focusRename}>
                        <DropdownMenuItem onSelect={() => { renameAfterClose.current = project }}>
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openInNewTab(project.id)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in new tab
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setUsageTarget(project)}>
                          <HardDrive className="h-3.5 w-3.5" />
                          Usage breakdown
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget(project)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {usageTarget && <ProjectUsageDialog key={usageTarget.id} project={usageTarget} onClose={() => setUsageTarget(null)} />}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete project "${deleteTarget?.title ?? ""}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </main>
  )
}
