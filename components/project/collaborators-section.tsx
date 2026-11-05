// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Link2, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  addMember,
  changeMemberRole,
  createShareLink,
  listMembers,
  listShareLinks,
  removeMember,
  revokeShareLink,
  type MemberRole,
  type ProjectMember,
  type ShareLink,
} from "@/lib/project-members"

const ROLE_OPTIONS = [
  { value: "EDITOR", label: "Can edit" },
  { value: "VIEWER", label: "Can view" },
] as const satisfies readonly { value: MemberRole; label: string }[]

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", EDITOR: "Can edit", VIEWER: "Can view" }

export function CollaboratorsSection({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [links, setLinks] = useState<ShareLink[]>([])
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<MemberRole>("VIEWER")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freshLink, setFreshLink] = useState<{ role: MemberRole; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<ShareLink | null>(null)

  const reload = useCallback(async () => {
    const [nextMembers, nextLinks] = await Promise.all([listMembers(projectId), listShareLinks(projectId)])
    setMembers(nextMembers)
    setLinks(nextLinks)
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    Promise.all([listMembers(projectId), listShareLinks(projectId)]).then(([nextMembers, nextLinks]) => {
      if (cancelled) return
      setMembers(nextMembers)
      setLinks(nextLinks)
    }).catch(() => { if (!cancelled) setError("Could not load collaborators.") })
    return () => { cancelled = true }
  }, [projectId])

  const run = async <T,>(action: () => Promise<{ data: T | null; error: string | null }>): Promise<{ data: T | null } | null> => {
    if (busy) return null
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return null
      }
      await reload()
      return { data: result.data }
    } catch {
      setError("Something went wrong — try again.")
      return null
    } finally {
      setBusy(false)
    }
  }

  const invite = async () => {
    const name = username.trim()
    if (!name) return
    if (await run(() => addMember(projectId, name, role))) setUsername("")
  }

  const makeLink = async (linkRole: MemberRole) => {
    const token = (await run(() => createShareLink(projectId, linkRole)))?.data?.token
    if (token) {
      setCopied(false)
      setFreshLink({ role: linkRole, url: `${window.location.origin}/join/${token}` })
    }
  }

  const copyFreshLink = async () => {
    if (!freshLink) return
    try {
      await navigator.clipboard.writeText(freshLink.url)
      setCopied(true)
    } catch {
      setError("Couldn't copy the link — copy it manually.")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="collaborator-username">Collaborators</Label>
        <p className="text-xs text-muted-foreground">People you add can open this project even while it is private. Only you can publish, delete or manage access.</p>
        <div className="flex gap-2">
          <Input
            id="collaborator-username"
            placeholder="Username"
            value={username}
            maxLength={20}
            disabled={busy}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void invite() }}
          />
          <Button variant="secondary" disabled={busy || !username.trim()} onClick={() => void invite()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </div>
        <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />
      </div>

      <ul className="flex flex-col gap-1">
        {members.map((member) => (
          <li key={member.username} className="flex min-h-10 items-center gap-2 text-[0.8125rem]">
            <span className="min-w-0 flex-1 truncate">
              @{member.username}
              {member.viaLink && <span className="ml-1.5 text-[0.6875rem] text-muted-foreground">via link</span>}
            </span>
            {member.role === "OWNER" ? (
              <span className="text-xs text-muted-foreground">{ROLE_LABEL.OWNER}</span>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => changeMemberRole(projectId, member.username, member.role === "EDITOR" ? "VIEWER" : "EDITOR"))}
                  title="Change role"
                  className="min-h-8 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  {ROLE_LABEL[member.role]}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => removeMember(projectId, member.username))}
                  aria-label={`Remove @${member.username}`}
                  className="flex min-h-8 min-w-8 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Label>Invite links</Label>
        <p className="text-xs text-muted-foreground">Anyone signed in with the link can join. Revoking a link removes everyone who joined through it.</p>
        {ROLE_OPTIONS.map((option) => {
          const active = links.find((link) => link.role === option.value)
          return (
            <div key={option.value} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[0.8125rem]">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {option.label}
                {active && <span className="ml-1.5 text-[0.6875rem] text-muted-foreground">used {active.useCount} {active.useCount === 1 ? "time" : "times"}</span>}
              </span>
              <button type="button" disabled={busy} onClick={() => void makeLink(option.value)} className="min-h-8 text-xs font-medium hover:text-foreground disabled:opacity-60">
                {active ? "New link" : "Create"}
              </button>
              {active && (
                <button type="button" disabled={busy} onClick={() => setPendingRevoke(active)} className="min-h-8 text-xs text-destructive disabled:opacity-60">
                  Revoke
                </button>
              )}
            </div>
          )
        })}
        {freshLink && (
          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Copy this link now: it is shown only once. Creating a new link revokes the previous one.</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={freshLink.url} onFocus={(e) => e.currentTarget.select()} aria-label={`${ROLE_LABEL[freshLink.role]} invite link`} />
              <Button variant="secondary" onClick={() => void copyFreshLink()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => { if (!open) setPendingRevoke(null) }}
        title="Revoke this invite link?"
        description="Everyone who joined through this link loses access. People you added by username keep theirs."
        confirmLabel="Revoke"
        destructive
        onConfirm={() => {
          const link = pendingRevoke
          setPendingRevoke(null)
          if (link) {
            if (freshLink?.role === link.role) setFreshLink(null)
            void run(() => revokeShareLink(projectId, link.id))
          }
        }}
      />
    </div>
  )
}
