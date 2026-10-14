"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StorageMeter } from "@/components/profile/plan-panel"
import { getProjectStorage, type ProjectStorage } from "@/lib/projects-store"

export function ProjectUsageDialog({ project, onClose }: { project: { id: string; title: string }; onClose: () => void }) {
  const [storage, setStorage] = useState<ProjectStorage | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getProjectStorage(project.id).then(result => {
      if (!cancelled) setStorage(result)
    }).catch(() => {
      if (!cancelled) setError(true)
    })
    return () => { cancelled = true }
  }, [project.id, attempt])

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project usage</DialogTitle>
          <DialogDescription className="break-words">{project.title}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="flex items-center gap-3">
            <p role="alert" className="text-sm text-destructive">Could not load project usage.</p>
            <Button variant="outline" size="sm" onClick={() => {
              setError(false)
              setAttempt(value => value + 1)
            }}>Retry</Button>
          </div>
        ) : storage ? <StorageMeter status={storage} /> : <p role="status" className="text-sm text-muted-foreground">Loading usage…</p>}
      </DialogContent>
    </Dialog>
  )
}
