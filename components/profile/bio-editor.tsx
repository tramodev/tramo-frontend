"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { updateMyProfile } from "@/lib/profile"

const BASELINE = "No description yet — add one to tell people what you're about."

export function BioEditor({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? "")
  const [draft, setDraft] = useState(initialBio ?? "")
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const router = useRouter()

  function startEditing() {
    setDraft(bio)
    setError(false)
    setEditing(true)
  }

  function handleSave() {
    if (isPending) return
    setError(false)
    startTransition(async () => {
      try {
        await updateMyProfile({ bio: draft.trim() })
        setBio(draft.trim())
        setEditing(false)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  if (editing) {
    return (
      <div className="w-3/4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={255}
          autoFocus
          placeholder="Tell people a bit about yourself"
          className="w-full resize-none rounded-xs border border-input bg-transparent p-3 text-sm outline-none focus:border-2 focus:border-primary"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-full text-xs font-medium transition-colors hover:bg-primary/90 py-[7px] px-3.5 bg-primary text-primary-foreground"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          {error && (
            <span className="text-xs font-medium text-destructive">
              Couldn&apos;t save, try again
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex w-3/4 items-start gap-2">
      <p
        className={`text-sm leading-[1.6] ${bio ? "text-foreground not-italic" : "text-muted-foreground italic"}`}
      >
        {bio || BASELINE}
      </p>
      <button
        type="button"
        onClick={startEditing}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 mt-0.5 text-muted-foreground"
        title="Edit description"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
