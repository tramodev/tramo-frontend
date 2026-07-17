"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
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
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  createProject,
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
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("modified")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  useEffect(() => {
    listProjects().then((loaded) => {
      setProjects(loaded)
      setLoading(false)
    })
  }, [])

  const sortedProjects = useMemo(() => {
    const copy = [...projects]
    if (sortBy === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    return copy
  }, [projects, sortBy])

  const handleCreateProject = async () => {
    const project = await createProject("Untitled project")
    router.push(`/editor/${project.id}`)
  }

  const startRename = (project: Project) => {
    setEditingId(project.id)
    setEditingTitle(project.title)
  }

  const submitRename = async (projectId: string) => {
    if (editingId !== projectId) return
    const title = editingTitle.trim()
    setEditingId(null)
    if (!title) return
    await renameProject(projectId, title)
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title } : p)),
    )
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
    <main className="mx-auto w-full flex-1 max-w-[1216px] pt-11 px-18 pb-[84px]">
        <span className="block text-sm font-medium text-primary mb-2">
          Your workspace
        </span>
        <h1 className="font-display text-[44px] font-normal leading-[1.1] mb-7">
          Start a new project
        </h1>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <button
            onClick={handleCreateProject}
            className="group flex aspect-[3/4] cursor-pointer flex-col items-start justify-end gap-2 rounded-lg p-5 transition-colors bg-card border border-dashed border-input text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary"
          >
            <Plus strokeWidth={2} className="h-7 w-7 transition-colors" />
            <span className="text-sm font-medium transition-colors">
              Blank project
            </span>
          </button>
        </div>

        <div className="mt-[70px]">
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
          ) : sortedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create a blank project to get started.
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sortedProjects.map((project) => (
                <Card
                  key={project.id}
                  className="group/card cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:bg-muted hover:shadow-elevation-1"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <CardContent
                    className={`mx-2 mt-2 flex aspect-[4/4] items-center justify-center overflow-hidden rounded-sm p-0 ${
                      project.thumbnail ? "" : "bg-surface-container-high"
                    }`}
                  >
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-full w-full scale-[1.15] object-cover object-top"
                      />
                    ) : (
                      <FolderKanban
                        strokeWidth={1.5}
                        className="h-9 w-9 text-muted-foreground"
                      />
                    )}
                  </CardContent>
                  <CardHeader className="gap-0 p-0 py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      {editingId === project.id ? (
                        <Input
                          autoFocus
                          value={editingTitle}
                          className="h-7"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(project.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          onBlur={() => submitRename(project.id)}
                        />
                      ) : (
                        <CardTitle
                          className="truncate text-sm font-medium"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startRename(project)
                          }}
                        >
                          {project.title}
                        </CardTitle>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onSelect={() => startRename(project)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openInNewTab(project.id)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open in new tab
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
                      Edited {formatUpdatedAt(project.updatedAt)}
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
                <div className="w-28 shrink-0">Visibility</div>
                <div className="w-32 shrink-0">Edited</div>
                <div className="w-8 shrink-0" />
              </div>
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  className="relative flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md ${
                      project.thumbnail ? "" : "bg-surface-container-high"
                    }`}
                  >
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-full w-full scale-[1.15] object-cover object-top"
                      />
                    ) : (
                      <FolderKanban strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === project.id ? (
                      <Input
                        autoFocus
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
                      <p
                        className="truncate text-sm font-medium"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          startRename(project)
                        }}
                      >
                        {project.title}
                      </p>
                    )}
                  </div>
                  <div className="w-28 shrink-0 text-sm capitalize text-muted-foreground">
                    {project.visibility}
                  </div>
                  <div className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatUpdatedAt(project.updatedAt)}
                  </div>
                  <div className="w-8 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => startRename(project)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openInNewTab(project.id)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in new tab
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
