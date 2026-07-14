"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Flag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { reportProject } from "@/lib/moderation"

export function ReportButton({ projectId, isLoggedIn }: { projectId: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  function handleTriggerClick(e: React.MouseEvent) {
    if (!isLoggedIn) {
      e.preventDefault()
      router.push("/login")
    }
  }

  async function handleSubmit() {
    if (!reason.trim() || isPending) return
    setIsPending(true)
    try {
      await reportProject(projectId, reason.trim())
      setSubmitted(true)
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setTimeout(() => {
        setReason("")
        setSubmitted(false)
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          title="Report this project"
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center transition-colors hover:bg-muted text-(--color-neutral-600)"
        >
          <Flag className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this project</DialogTitle>
          <DialogDescription>
            Let us know what&apos;s wrong. Our team will review it.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <p className="text-sm text-(--color-neutral-700)">
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
            <Button onClick={handleSubmit} disabled={!reason.trim() || isPending} className="w-full">
              {isPending ? "Submitting..." : "Submit report"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
