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
          className="w-full resize-none rounded-md text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md text-xs font-bold transition-colors hover:bg-[var(--color-accent-600)] py-[7px] px-3.5 bg-(--color-accent) text-[#fff]"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="text-xs font-bold transition-colors hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          {error && (
            <span className="text-xs font-semibold text-(--color-accent)">
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
        className={`text-sm leading-[1.6] ${bio ? "text-(--color-neutral-800) not-italic" : "text-(--color-neutral-600) italic"}`}
      >
        {bio || BASELINE}
      </p>
      <button
        type="button"
        onClick={startEditing}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 mt-0.5 text-(--color-neutral-600)"
        title="Edit description"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
