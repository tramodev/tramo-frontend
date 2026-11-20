// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FolderKanban, Loader2, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import { formatBytes } from "@/lib/format-bytes"
import {
  deleteProject,
  listTrashedProjects,
  restoreProject,
  type Project,
} from "@/lib/projects-store"

const RETENTION_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function daysLeft(trashedAt: string | null): number {
  if (!trashedAt) return RETENTION_DAYS
  return Math.max(0, Math.ceil(RETENTION_DAYS - (Date.now() - new Date(trashedAt).getTime()) / DAY_MS))
}

export default function TrashPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  useEffect(() => {
    let cancelled = false
    listTrashedProjects().then((loaded) => {
      if (!cancelled) setProjects(loaded)
    }).catch(() => {
      if (!cancelled) setError("Could not load the trash. Please try again.")
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const run = async (project: Project, action: (id: string) => Promise<void>, failure: string) => {
    setBusyIds((prev) => new Set(prev).add(project.id))
    setError("")
    try {
      await action(project.id)
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch {
      setError(failure)
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(project.id)
        return next
      })
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const project = deleteTarget
    setDeleteTarget(null)
    run(project, deleteProject, `Could not delete "${project.title}". Try again.`)
  }

  return (
    <main id="main-content" tabIndex={-1} className="w-full flex-1 pb-[84px]">
      <div className="container-app px-5 py-11 sm:px-10 lg:px-12">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/projects">
            <ArrowLeft className="h-3.5 w-3.5" />
            My projects
          </Link>
        </Button>
        <h1 className="font-display text-[2.75rem] font-normal leading-[1.1] mb-3">Trash</h1>
        <p className="mb-7 max-w-2xl text-sm text-muted-foreground">
          Projects stay here for {RETENTION_DAYS} days and keep counting toward your storage until they are deleted for good. Their images can take up to a day longer to leave storage.
        </p>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div role="status" aria-label="Loading trash" className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          </div>
        ) : projects.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">The trash is empty.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {projects.map((project) => {
              const days = daysLeft(project.trashedAt)
              return (
                <div key={project.id} className="flex items-center gap-4 px-4 py-3">
                  <ProjectThumbnail
                    thumbnailImageUrl={project.thumbnailImageUrl}
                    title={project.title}
                    className="h-12 w-12 shrink-0 rounded-md"
                    placeholder={<FolderKanban strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.title}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {days === 0 ? "Deleted today" : `Deleted in ${days} day${days === 1 ? "" : "s"}`} · {formatBytes(project.storageBytes)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyIds.has(project.id)}
                    onClick={() => run(project, restoreProject, `Could not restore "${project.title}". Try again.`)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busyIds.has(project.id)}
                    aria-label={`Delete ${project.title} forever`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(project)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete "${deleteTarget?.title ?? ""}" forever?`}
        description="This can't be undone."
        confirmLabel="Delete forever"
        onConfirm={confirmDelete}
      />
    </main>
  )
}
