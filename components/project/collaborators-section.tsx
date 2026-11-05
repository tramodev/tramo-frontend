// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, Eye, Globe, Loader2, Lock, Pencil, X, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel } from "@/components/ui/field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AuthorAvatar } from "@/components/shared/author-avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getPublicProfile } from "@/lib/public-profile"
import {
  addMember,
  changeMemberRole,
  clearShareLink,
  getShareLink,
  listMembers,
  removeMember,
  setShareLink,
  type MemberRole,
  type ProjectMember,
  type ShareLink,
} from "@/lib/project-members"

type MenuOption<T extends string> = { value: T; label: string; description: string; icon: LucideIcon }

const ROLE_OPTIONS = [
  { value: "EDITOR", label: "Can edit", description: "Write notes and change trails", icon: Pencil },
  { value: "VIEWER", label: "Can view", description: "Read the project without changing it", icon: Eye },
] as const satisfies readonly MenuOption<MemberRole>[]

const ACCESS_OPTIONS = [
  { value: "RESTRICTED", label: "Restricted", description: "Only people with access can open it", icon: Lock },
  { value: "LINK", label: "Anyone with the link", description: "Anyone signed in with the link can join", icon: Globe },
] as const satisfies readonly MenuOption<"RESTRICTED" | "LINK">[]

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", EDITOR: "Can edit", VIEWER: "Can view" }

function OptionMenu<T extends string>({ value, options, onChange, disabled, label, className, align = "end" }: {
  value: T
  options: readonly MenuOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  label: string
  className?: string
  align?: "start" | "end"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={label}
          className={cn("flex min-h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs transition-colors hover:bg-muted data-[state=open]:bg-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent", className)}
        >
          {options.find((option) => option.value === value)?.label}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 p-1.5">
        {options.map((option) => {
          const Icon = option.icon
          return (
            <DropdownMenuItem key={option.value} onSelect={() => { if (option.value !== value) onChange(option.value) }} className="items-start gap-3 rounded-md px-3 py-2.5">
              <Icon className="mt-0.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </span>
              {option.value === value && <Check className="mt-0.5 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CollaboratorsSection({ projectId, owner, onLinkChange }: {
  projectId: string
  owner?: { username: string; imageUrl: string | null } | null
  onLinkChange?: (url: string | null) => void
}) {
  const [members, setMembers] = useState<ProjectMember[]>(() => owner ? [{ ...owner, role: "OWNER", viaLink: false }] : [])
  const [loaded, setLoaded] = useState(false)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<MemberRole>("VIEWER")
  const [inviting, setInviting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRestrict, setConfirmRestrict] = useState(false)
  const [lookup, setLookup] = useState<{ query: string; user: { username: string; imageUrl: string | null; self: boolean } | null } | null>(null)
  const query = username.trim()

  const apply = useCallback((nextMembers: ProjectMember[], nextLink: ShareLink | null) => {
    setMembers(nextMembers)
    setLink(nextLink)
    setLoaded(true)
    onLinkChange?.(nextLink ? `${window.location.origin}/join/${nextLink.token}` : null)
  }, [onLinkChange])

  const reload = useCallback(async () => {
    const [nextMembers, nextLink] = await Promise.all([listMembers(projectId), getShareLink(projectId)])
    apply(nextMembers, nextLink)
  }, [projectId, apply])

  useEffect(() => {
    let cancelled = false
    Promise.all([listMembers(projectId), getShareLink(projectId)]).then(([nextMembers, nextLink]) => {
      if (!cancelled) apply(nextMembers, nextLink)
    }).catch(() => { if (!cancelled) setError("Could not load who has access.") })
    return () => { cancelled = true }
  }, [projectId, apply])

  useEffect(() => {
    if (!query) return
    let cancelled = false
    const timer = setTimeout(() => {
      getPublicProfile(query).then((profile) => {
        if (!cancelled) setLookup({ query, user: profile && !profile.blocked ? { username: profile.username, imageUrl: profile.imageUrl, self: profile.self } : null })
      }).catch(() => { if (!cancelled) setLookup({ query, user: null }) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const suggestion = lookup?.query === query ? lookup : null
  const invitable = suggestion?.user && !suggestion.user.self ? suggestion.user : null

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

  const startInvite = () => {
    if (!invitable || busy) return
    setError(null)
    setRole((members.find((member) => member.username === invitable.username)?.role as MemberRole | undefined) ?? "VIEWER")
    setInviting(invitable.username)
  }

  const invite = async () => {
    if (!inviting) return
    if (await run(() => addMember(projectId, inviting, role))) {
      setInviting(null)
      setUsername("")
    }
  }

  const joinedViaLink = members.filter((member) => member.viaLink).length

  const changeAccess = (next: string) => {
    if (next === "LINK" && !link) void run(() => setShareLink(projectId, "VIEWER"))
    else if (next === "RESTRICTED" && link) {
      if (joinedViaLink > 0) setConfirmRestrict(true)
      else void run(() => clearShareLink(projectId))
    }
  }

  if (inviting) return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.8125rem]">Invite <span className="font-medium">@{inviting}</span></p>
      <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={busy} onClick={() => { setError(null); setInviting(null) }}>Back</Button>
        <Button disabled={busy} onClick={() => void invite()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Field floatingLabel>
          <FieldLabel htmlFor="collaborator-username">Add people by username</FieldLabel>
          <Input
            id="collaborator-username"
            placeholder=" "
            value={username}
            maxLength={20}
            disabled={busy}
            autoComplete="off"
            aria-describedby={query ? "collaborator-suggestion" : undefined}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startInvite() }}
          />
        </Field>
        {query && <div id="collaborator-suggestion" role="status">
          {!suggestion ? (
            <p className="flex min-h-12 items-center gap-2 px-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Looking for @{query}…</p>
          ) : invitable ? (
            <button type="button" disabled={busy} onClick={startInvite}
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-[0.8125rem] transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
              <AuthorAvatar username={invitable.username} avatar={invitable.imageUrl} size={28} />
              <span className="min-w-0 flex-1 truncate font-medium">@{invitable.username}</span>
              <span className="text-xs text-muted-foreground">{members.some((member) => member.username === invitable.username) ? "Has access · change role" : "Invite"}</span>
            </button>
          ) : (
            <p className="flex min-h-12 items-center px-2 text-xs text-muted-foreground">{suggestion.user?.self ? "That's you: you already own this project." : `No user named @${query}.`}</p>
          )}
        </div>}
      </div>

      <div className="flex flex-col gap-1">
        <Label>People with access</Label>
        <ul className="flex flex-col gap-1">
          {members.map((member) => (
            <li key={member.username} className="flex min-h-10 items-center gap-2 text-[0.8125rem]">
              <AuthorAvatar username={member.username} avatar={member.imageUrl} size={28} />
              <span className="min-w-0 flex-1 truncate">
                @{member.username}
                {member.viaLink && <span className="ml-1.5 text-[0.6875rem] text-muted-foreground">via link</span>}
              </span>
              {member.role === "OWNER" ? (
                <span className="text-xs text-muted-foreground">{ROLE_LABEL.OWNER}</span>
              ) : (
                <>
                  <OptionMenu
                    value={member.role as MemberRole}
                    options={ROLE_OPTIONS}
                    disabled={busy}
                    onChange={(next) => void run(() => changeMemberRole(projectId, member.username, next))}
                    label={`Role for @${member.username}`}
                  />
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
          {!loaded && <li role="status" className="flex min-h-10 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading people…</li>}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>General access</Label>
        <div className="-mx-2 flex min-h-10 items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            {link ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <OptionMenu
              value={link ? "LINK" : "RESTRICTED"}
              options={ACCESS_OPTIONS}
              disabled={busy || !loaded}
              onChange={changeAccess}
              label="General access"
              align="start"
              className="self-start text-[0.8125rem] font-medium"
            />
            <span className="px-2 text-[0.6875rem] text-muted-foreground">
              {!loaded ? "Loading…" : link
                ? `Anyone signed in with the link can join${link.useCount ? ` · used ${link.useCount} ${link.useCount === 1 ? "time" : "times"}` : ""}`
                : "Only people with access can open it with the link"}
            </span>
          </div>
          {link && (
            <OptionMenu
              value={link.role}
              options={ROLE_OPTIONS}
              disabled={busy}
              onChange={(next) => void run(() => setShareLink(projectId, next))}
              label="Role for anyone with the link"
            />
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmRestrict}
        onOpenChange={setConfirmRestrict}
        title="Restrict access?"
        description={`${joinedViaLink} ${joinedViaLink === 1 ? "person who joined" : "people who joined"} through the link will lose access. People you added by username keep theirs. The current link stops working.`}
        confirmLabel="Restrict"
        destructive
        onConfirm={() => {
          setConfirmRestrict(false)
          void run(() => clearShareLink(projectId))
        }}
      />
    </div>
  )
}
