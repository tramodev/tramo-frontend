"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, FolderKanban, Trash2 } from "lucide-react"

import { Wordmark } from "@/components/logo"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  useEffect(() => {
    listProjects().then((loaded) => {
      setProjects(loaded)
      setLoading(false)
    })
  }, [])

  const handleCreateProject = async () => {
    const project = await createProject("Untitled project")
    router.push(`/dashboard/${project.id}`)
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

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.title}"? This can't be undone.`)) {
      return
    }
    await deleteProject(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Wordmark />
        <span className="text-sm text-muted-foreground">Projects</span>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium">Start a new project</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <button
            onClick={handleCreateProject}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <FilePlus2 className="h-8 w-8" />
            <span className="text-sm font-medium">Blank project</span>
          </button>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Recent projects
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create a blank project to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="group/card cursor-pointer gap-3 py-4 transition-colors hover:border-primary"
                  onClick={() => router.push(`/dashboard/${project.id}`)}
                >
                  <CardContent className="flex aspect-[4/3] items-center justify-center px-4">
                    <FolderKanban className="h-10 w-10 text-muted-foreground" />
                  </CardContent>
                  <CardHeader className="gap-1 px-4">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover/card:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(project)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Edited {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
