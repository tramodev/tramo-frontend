"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, FolderKanban, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type Project,
} from "@/lib/projects-store"


function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
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

  useEffect(() => {
    listProjects().then((loaded) => {
      setProjects(loaded)
      setLoading(false)
    })
  }, [])

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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const project = deleteTarget
    setDeleteTarget(null)
    await deleteProject(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
  }

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px] pt-11 px-18 pb-[84px]">
        <span
          className="block text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-accent) mb-2"
        >
          Your workspace
        </span>
        <h1 className="text-[48px] font-extrabold tracking-[-0.025em] leading-[1.05] mb-7">
          Start a new project
        </h1>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <button
            onClick={handleCreateProject}
            className="group flex aspect-[3/4] cursor-pointer flex-col items-start justify-end gap-2 rounded-lg p-5 transition-colors bg-(--color-bg) border-2 border-dashed border-(--color-neutral-500) hover:border-(--color-accent) text-(--color-neutral-700)"
          >
            <Plus
              strokeWidth={2}
              className="h-7 w-7 transition-colors group-hover:text-[var(--color-accent-700)]"
            />
            <span className="text-sm font-semibold transition-colors group-hover:text-[var(--color-accent-700)]">
              Blank project
            </span>
          </button>
        </div>

        <div className="mt-[70px]">
          <span className="kicker mb-5">My projects</span>
          {loading ? (
            <p className="text-sm text-(--color-neutral-700)">
              Loading...
            </p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-(--color-neutral-700)">
              No projects yet. Create a blank project to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="group/card rounded-card cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-[var(--color-accent)]"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <CardContent
                    className="flex aspect-[4/3] items-center justify-center overflow-hidden p-0 border-b border-(--color-divider)"
                  >
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <FolderKanban
                        strokeWidth={1.5}
                        className="h-9 w-9 text-(--color-neutral-600)"
                      />
                    )}
                  </CardContent>
                  <CardHeader className="gap-0 p-0 py-3.5 px-4">
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
                          className="truncate text-sm font-bold"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startRename(project)
                          }}
                        >
                          {project.title}
                        </CardTitle>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover/card:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(project)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p
                      className="text-xs tabular-nums mt-1.5 text-(--color-neutral-700)"
                    >
                      Edited {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </CardHeader>
                </Card>
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
