"use client"

import { Button } from "@/components/ui/button"
import { usePatreonConnection } from "@/hooks/use-patreon-connection"
import type { SubscriptionStatus } from "@/lib/subscription"

export function PatreonButton({ onSupporter }: { onSupporter: (status: SubscriptionStatus) => void }) {
  const { connect, pending, waiting, error } = usePatreonConnection(onSupporter)

  return <div className="space-y-3">
    <Button disabled={pending} onClick={connect}>
      {pending ? "Connecting…" : "Become a supporter"}
    </Button>
    <button type="button" disabled={pending} onClick={connect} className="block cursor-pointer text-left text-xs underline underline-offset-4 disabled:opacity-50">
      Already a supporter? Link your account
    </button>
    {waiting && <p role="status" className="text-xs">Complete the steps in Patreon, then return here. Your benefits will update automatically. Confirmation may take a moment.</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>
}
