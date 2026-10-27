"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Flag, Search, ShieldBan, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  listReports, dismissReport, searchAdminUsers, banUser, unbanUser, unpublishProject,
  upholdCommentReport,
  type Report, type AdminUser,
} from "@/lib/moderation"

type ActionTarget = { kind: "ban"; user: AdminUser } | { kind: "unpublish" | "delete"; report: Report }

export function AdminDashboard() {
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [type, setType] = useState("ALL")
  const [status, setStatus] = useState("OPEN")
  const [epoch, setEpoch] = useState(0)
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [target, setTarget] = useState<ActionTarget | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const action = useRef(false)
  const reportsHeading = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let cancelled = false
    listReports(page, type, status).then(data => {
      if (!cancelled) { setReports(data.items); setHasMore(data.hasMore) }
    }).catch(() => {
      if (!cancelled) { setReports([]); setHasMore(false); setActionError("Could not load reports. Please retry.") }
    }).finally(() => { if (!cancelled) setReportsLoading(false) })
    return () => { cancelled = true }
  }, [page, type, status, epoch])

  useEffect(() => {
    let cancelled = false
    searchAdminUsers(query).then(data => {
      if (!cancelled) setUsers(data)
    }).catch(() => {
      if (!cancelled) setActionError("Could not load users. Please retry.")
    }).finally(() => { if (!cancelled) setUsersLoading(false) })
    return () => { cancelled = true }
  }, [query, epoch])

  function openAction(next: ActionTarget, button: HTMLButtonElement) {
    returnFocus.current = button
    setReason("")
    setTarget(next)
  }

  function refresh() {
    setReportsLoading(true)
    setEpoch(value => value + 1)
  }

  async function handleDismiss(report: Report) {
    if (action.current) return
    action.current = true; setBusy(true); setActionError(null)
    try {
      await dismissReport(report.id, report.type)
      setNotice("Report dismissed.")
      refresh()
      requestAnimationFrame(() => reportsHeading.current?.focus())
    } catch { setActionError("Could not dismiss the report. Please try again.") }
    finally { action.current = false; setBusy(false) }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault()
    if (!target || action.current) return
    action.current = true; setBusy(true); setActionError(null)
    try {
      if (target.kind === "ban") await banUser(target.user.id, reason.trim() || undefined)
      else if (target.kind === "delete") await upholdCommentReport(target.report.id, reason.trim() || undefined)
      else if (target.report.projectId) await unpublishProject(target.report.projectId, reason.trim() || undefined)
      else throw new Error("Project is missing")
      setNotice(target.kind === "ban" ? "User banned." : target.kind === "delete" ? "Comment deleted." : "Project unpublished. Publishing is blocked until a moderator allows it.")
      setTarget(null)
      refresh()
    } catch { setActionError("Could not complete the moderation action. Please try again.") }
    finally { action.current = false; setBusy(false) }
  }

  async function handleUnban(user: AdminUser) {
    if (action.current) return
    action.current = true; setBusy(true); setActionError(null)
    try {
      await unbanUser(user.id)
      setNotice("User unbanned.")
      refresh()
    } catch { setActionError("Could not unban the user. Please try again.") }
    finally { action.current = false; setBusy(false) }
  }

  return <div className="flex min-w-0 flex-col gap-12">
    {actionError && !target && <p role="alert" className="text-sm text-destructive">{actionError} <Button variant="ghost" onClick={refresh} disabled={busy}>Retry</Button></p>}
    <p role="status" className="text-sm text-muted-foreground">{notice}</p>
    <section className="min-w-0">
      <h2 ref={reportsHeading} tabIndex={-1} className="mb-4 font-display text-xl font-medium">Reports</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm">Type
          <select value={type} disabled={busy} className="h-9 rounded-md border border-input bg-background px-3" onChange={event => { setType(event.target.value); setPage(0); setReportsLoading(true) }}>
            <option value="ALL">All types</option><option value="PROJECT">Projects</option><option value="COMMENT">Comments</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">Status
          <select value={status} disabled={busy} className="h-9 rounded-md border border-input bg-background px-3" onChange={event => { setStatus(event.target.value); setPage(0); setReportsLoading(true) }}>
            <option value="OPEN">Open</option><option value="UPHELD">Upheld</option><option value="DISMISSED">Dismissed</option>
          </select>
        </label>
      </div>
      {reportsLoading ? <p role="status" className="text-sm text-muted-foreground">Loading reports…</p> : reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports on this page.</p> : <div className="flex min-w-0 flex-col gap-3">
        {reports.map(report => <div key={`${report.type}:${report.id}`} className="flex min-w-0 flex-col items-start justify-between gap-4 rounded-lg border border-border p-4 sm:flex-row">
          <div className="flex min-w-0 max-w-full flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Flag className="h-3.5 w-3.5 shrink-0 text-primary" />
              <Link href={`/p/${report.projectId}${report.type === "COMMENT" ? `#comment-${report.commentId}` : ""}`} target="_blank" rel="noopener noreferrer" className="min-w-0 font-medium hover:underline">{report.type === "COMMENT" ? `comment on ${report.projectTitle}` : report.projectTitle}</Link>
              <span className="text-muted-foreground">reported by {report.reporterUsername}</span>
            </div>
            {report.type === "COMMENT" && <p className="text-sm italic text-muted-foreground">&ldquo;{report.commentContent || "Comment deleted"}&rdquo;</p>}
            <p className="text-sm text-muted-foreground">{report.reason}</p>
            <p className="text-xs text-muted-foreground">{report.status} · <time dateTime={report.createdDate}>{new Date(report.createdDate).toLocaleString()}</time></p>
          </div>
          {report.status === "OPEN" && <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleDismiss(report)}>Dismiss</Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={event => openAction({ kind: report.type === "COMMENT" ? "delete" : "unpublish", report }, event.currentTarget)}>{report.type === "COMMENT" ? "Delete comment" : "Unpublish"}</Button>
          </div>}
        </div>)}
      </div>}
      <div className="mt-4 flex items-center gap-3">
        <Button variant="outline" aria-disabled={page === 0 || reportsLoading || busy} onClick={() => { if (page > 0 && !reportsLoading && !busy) { setPage(value => value - 1); setReportsLoading(true) } }}>Previous reports</Button>
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <Button variant="outline" aria-disabled={!hasMore || reportsLoading || busy} onClick={() => { if (hasMore && !reportsLoading && !busy) { setPage(value => value + 1); setReportsLoading(true) } }}>Next reports</Button>
      </div>
    </section>
    <section className="min-w-0">
      <h2 className="mb-4 font-display text-xl font-medium">Users</h2>
      <div className="relative mb-4 max-w-[360px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search users by username or email" placeholder="Search by username or email…" className="pl-9" value={query} onChange={event => { setQuery(event.target.value); setUsersLoading(true) }} />
      </div>
      {usersLoading ? <p role="status" className="text-sm text-muted-foreground">Loading users…</p> : <div className="flex flex-col gap-2">
        {users.map(user => <div key={user.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 [overflow-wrap:anywhere]">
            <span className="min-w-0 font-bold">{user.username}</span><span className="min-w-0 text-sm text-muted-foreground">{user.email}</span>
            {user.role === "ADMIN" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">ADMIN</span>}
            {user.banned && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">BANNED</span>}
          </div>
          {user.banned ? <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleUnban(user)}><ShieldCheck className="h-3.5 w-3.5" />Unban</Button> : user.role !== "ADMIN" && <Button variant="destructive" size="sm" disabled={busy} onClick={event => openAction({ kind: "ban", user }, event.currentTarget)}><ShieldBan className="h-3.5 w-3.5" />Ban</Button>}
        </div>)}
      </div>}
    </section>
    <Dialog open={target !== null} onOpenChange={open => { if (!open && !action.current) setTarget(null) }}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); else reportsHeading.current?.focus() }}>
        <form onSubmit={event => void handleConfirm(event)} className="min-w-0 space-y-4">
          <DialogHeader>
            <DialogTitle className="[overflow-wrap:anywhere]">{target?.kind === "ban" ? `Ban ${target.user.username}?` : target?.kind === "delete" ? "Delete this comment?" : "Unpublish this project?"}</DialogTitle>
            <DialogDescription>{target?.kind === "ban" ? "The user will lose access to their account." : target?.kind === "delete" ? "The comment will be removed and open reports about it will be upheld." : "The project will become private. Publishing stays blocked until a moderator allows it in the moderation log."}</DialogDescription>
          </DialogHeader>
          <label className="block space-y-2 text-sm">Moderator reason (optional)<Input value={reason} maxLength={255} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={busy}>{busy ? "Saving…" : target?.kind === "ban" ? "Ban user" : target?.kind === "delete" ? "Delete comment" : "Unpublish"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
}
