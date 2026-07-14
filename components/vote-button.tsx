"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowBigUp } from "lucide-react"
import { toggleProjectVote } from "@/lib/projects-store"

export function VoteButton({
  projectId,
  initialVoted,
  initialCount,
  isLoggedIn,
}: {
  projectId: string
  initialVoted: boolean
  initialCount: number
  isLoggedIn: boolean
}) {
  const [voted, setVoted] = useState(initialVoted)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending) return

    const prevVoted = voted
    const prevCount = count
    const nextVoted = !voted
    setVoted(nextVoted)
    setCount(prevCount + (nextVoted ? 1 : -1))

    startTransition(async () => {
      try {
        const result = await toggleProjectVote(projectId)
        setVoted(result.voted)
        setCount(result.count)
      } catch {
        setVoted(prevVoted)
        setCount(prevCount)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={voted}
      className={`relative z-10 flex shrink-0 items-center gap-0.5 rounded-md pr-1 py-1.5 transition-colors cursor-pointer hover:text-(--color-accent) ${
        voted ? "text-(--color-accent)" : "text-(--color-neutral-600)"
      }`}
    >
      <ArrowBigUp className="h-5 w-5" fill={voted ? "currentColor" : "none"} />
      <span className="text-xs font-bold">{count}</span>
    </button>
  )
}
