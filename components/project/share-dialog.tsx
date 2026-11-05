// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { ArrowLeft, Check, Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CollaboratorsSection, type Invitee } from "@/components/project/collaborators-section"

export function ShareDialog({ projectId, projectTitle, owner, open, onOpenChange }: {
  projectId: string
  projectTitle: string
  owner?: { username: string; imageUrl: string | null } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [copied, setCopied] = useState(false)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [inviting, setInviting] = useState<Invitee | null>(null)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl ?? `${window.location.origin}/editor/${projectId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setInviting(null); onOpenChange(next) }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-2">
            {inviting && <button type="button" onClick={() => setInviting(null)} aria-label="Back to sharing"
              className="-ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>}
            <DialogTitle className="truncate">Share “{projectTitle || "Untitled project"}”</DialogTitle>
          </div>
          <DialogDescription>People you add can open this project even while it is private. Only you can publish, delete or manage access.</DialogDescription>
        </DialogHeader>
        <CollaboratorsSection projectId={projectId} owner={owner} onLinkChange={setLinkUrl} inviting={inviting} onInvitingChange={setInviting} />
        {!inviting && <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => void copyLink()} title={linkUrl ? "Anyone signed in with this link can join" : "Only people with access can open it"}>
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
