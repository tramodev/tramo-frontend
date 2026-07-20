"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban } from "lucide-react"
import { toggleBlock } from "@/lib/blocked-users"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function BlockButton({
  username,
  initialBlocked,
  isLoggedIn,
}: {
  username: string
  initialBlocked: boolean
  isLoggedIn: boolean
}) {
  const [blocked, setBlocked] = useState(initialBlocked)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending) return

    const prevBlocked = blocked
    setBlocked(!prevBlocked)
    setError(false)

    startTransition(async () => {
      try {
        const result = await toggleBlock(username)
        setBlocked(result.blocked)
        router.refresh()
      } catch {
        setBlocked(prevBlocked)
        setError(true)
      }
    })
  }

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted ${
              blocked ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <Ban className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{blocked ? "Unblock this user" : "Block this user"}</TooltipContent>
      </Tooltip>
      {error && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] font-medium text-destructive">
          Couldn&apos;t update, try again
        </span>
      )}
    </div>
  )
}
