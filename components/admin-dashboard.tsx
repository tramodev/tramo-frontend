"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Flag, Search, ShieldBan, ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  listReports,
  dismissReport,
  searchAdminUsers,
  banUser,
  unbanUser,
  unpublishProject,
  type Report,
  type AdminUser,
} from "@/lib/moderation"

export function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [unpublishTarget, setUnpublishTarget] = useState<Report | null>(null)

  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")

  useEffect(() => {
    listReports().then((data) => {
      setReports(data)
      setReportsLoading(false)
    })
  }, [])

  function refreshUsers(q: string) {
    setUsersLoading(true)
    searchAdminUsers(q).then((data) => {
      setUsers(data)
      setUsersLoading(false)
    })
  }

  useEffect(() => {
    refreshUsers("")
  }, [])

  async function handleDismiss(report: Report) {
    setReports((current) => current.filter((r) => r.id !== report.id))
    await dismissReport(report.id, report.type)
  }

  async function handleUnpublish() {
    const projectId = unpublishTarget?.projectId
    if (!unpublishTarget || !projectId) return
    const target = unpublishTarget
    setUnpublishTarget(null)
    setReports((current) => current.filter((r) => r.id !== target.id))
    await unpublishProject(projectId, target.reason)
  }

  async function handleBanConfirm() {
    if (!banTarget) return
    const target = banTarget
    setBanTarget(null)
    setUsers((current) => current.map((u) => (u.id === target.id ? { ...u, banned: true } : u)))
    await banUser(target.id, banReason || undefined)
    setBanReason("")
  }

  async function handleUnban(user: AdminUser) {
    setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, banned: false } : u)))
    await unbanUser(user.id)
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="mb-4 font-display text-xl font-medium">Open reports</h2>
        {reportsLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-start justify-between gap-4 rounded-lg p-4 border border-border"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Flag className="h-3.5 w-3.5 text-primary" />
                    {report.type === "COMMENT" ? (
                      <>
                        <Link href={`/p/${report.projectId}`} target="_blank" className="font-medium hover:underline">
                          comment on {report.projectTitle}
                        </Link>
                        <span className="text-muted-foreground">
                          reported by {report.reporterUsername}
                        </span>
                      </>
                    ) : (
                      <>
                        <Link href={`/p/${report.projectId}`} target="_blank" className="font-medium hover:underline">
                          {report.projectTitle}
                        </Link>
                        <span className="text-muted-foreground">
                          reported by {report.reporterUsername}
                        </span>
                      </>
                    )}
                  </div>
                  {report.type === "COMMENT" && (
                    <p className="text-sm italic text-muted-foreground">&ldquo;{report.commentContent}&rdquo;</p>
                  )}
                  <p className="text-sm text-muted-foreground">{report.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDismiss(report)}>
                    Dismiss
                  </Button>
                  {report.type === "PROJECT" && (
                    <Button variant="destructive" size="sm" onClick={() => setUnpublishTarget(report)}>
                      Unpublish
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-medium">Users</h2>
        <div className="relative mb-4 max-w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or email..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              refreshUsers(e.target.value)
            }}
          />
        </div>
        {usersLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-lg p-3 border border-border"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-bold">{user.username}</span>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  {user.role === "ADMIN" && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted">
                      ADMIN
                    </span>
                  )}
                  {user.banned && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-destructive-foreground bg-destructive">
                      BANNED
                    </span>
                  )}
                </div>
                {user.banned ? (
                  <Button variant="outline" size="sm" onClick={() => handleUnban(user)}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Unban
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => setBanTarget(user)}>
                    <ShieldBan className="h-3.5 w-3.5" />
                    Ban
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!unpublishTarget}
        onOpenChange={(open) => !open && setUnpublishTarget(null)}
        title="Unpublish this project?"
        description={`"${unpublishTarget?.projectTitle}" will be set back to private and removed from Explore. The report will be marked as actioned.`}
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
      />

      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]">
          <div className="w-full max-w-sm rounded-2xl p-5 bg-popover border border-border shadow-elevation-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Ban {banTarget.username}?</h3>
              <button type="button" onClick={() => setBanTarget(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input
              placeholder="Reason (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setBanTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBanConfirm}>
                Ban user
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
