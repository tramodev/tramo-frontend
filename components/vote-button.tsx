"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowBigUp } from "lucide-react"
import { toggleProjectVote } from "@/lib/projects-store"
import { BurstParticles } from "@/components/burst-particles"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
  const [burstId, setBurstId] = useState(0)
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
    if (nextVoted) setBurstId((n) => n + 1)

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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-pressed={voted}
          className={`relative z-10 flex h-8 shrink-0 px-2 cursor-pointer items-center rounded-full text-sm font-medium transition-colors ${
            voted
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <span key={burstId} className="relative inline-flex">
            <ArrowBigUp
              className={burstId > 0 ? "h-[15px] w-[15px] burst-pop" : "h-[15px] w-[15px]"}
              fill={voted ? "currentColor" : "none"}
            />
            {burstId > 0 && <BurstParticles />}
          </span>
          <span className="text-[13px]">{count}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{voted ? "Remove upvote" : "Upvote"}</TooltipContent>
    </Tooltip>
  )
}
