"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Flag, UserPlus, UserCheck } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { reportProject } from "@/lib/moderation"
import { toggleFollow } from "@/lib/public-profile"

export function PostOptionsMenu({
  projectId,
  ownerUsername,
  isLoggedIn,
  isOwnPost = false,
  className,
}: {
  projectId: string
  ownerUsername: string
  isLoggedIn: boolean
  isOwnPost?: boolean
  className?: string
}) {
  const router = useRouter()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [following, setFollowing] = useState(false)

  function requireLogin(): boolean {
    if (!isLoggedIn) {
      router.push("/login")
      return false
    }
    return true
  }

  async function handleFollow() {
    if (!requireLogin()) return
    const result = await toggleFollow(ownerUsername)
    setFollowing(result.following)
  }

  function handleReportSelect() {
    if (!requireLogin()) return
    setReportOpen(true)
  }

  async function handleReportSubmit() {
    if (!reason.trim() || isPending) return
    setIsPending(true)
    try {
      await reportProject(projectId, reason.trim())
      setSubmitted(true)
    } finally {
      setIsPending(false)
    }
  }

  function handleReportDialogChange(open: boolean) {
    setReportOpen(open)
    if (!open) {
      setTimeout(() => {
        setReason("")
        setSubmitted(false)
      }, 200)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            title="More options"
            className={`z-10 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className ?? "relative"}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwnPost ? (
            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={handleFollow}>
                {following ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Follow {ownerUsername}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleReportSelect}>
                <Flag className="h-3.5 w-3.5" />
                Report post
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={handleReportDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this project</DialogTitle>
            <DialogDescription>
              Let us know what&apos;s wrong. Our team will review it.
            </DialogDescription>
          </DialogHeader>
          {submitted ? (
            <p className="text-sm text-muted-foreground">
              Thanks — your report has been submitted.
            </p>
          ) : (
            <>
              <Textarea
                placeholder="Describe the issue..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              <Button onClick={handleReportSubmit} disabled={!reason.trim() || isPending} className="w-full">
                {isPending ? "Submitting..." : "Submit report"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
