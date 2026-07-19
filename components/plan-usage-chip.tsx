"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HardDrive } from "lucide-react"
import { getSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription"

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

/** Compact storage/publish usage pill linking to the Plan settings tab. Renders nothing until loaded. */
export function PlanUsageChip({ className }: { className?: string }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    getSubscriptionStatus().then(setStatus).catch(() => {})
  }, [])

  if (!status) return null

  return (
    <Link
      href="/settings?tab=plan"
      className={`inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted ${className ?? ""}`}
    >
      <HardDrive className="h-3.5 w-3.5" />
      {formatBytes(status.storageUsedBytes)} / {formatBytes(status.storageQuotaBytes)}
      {status.publishesPerWeek !== -1 && (
        <span className="text-muted-foreground">
          · {status.publishesUsedThisWeek}/{status.publishesPerWeek} publishes this week
        </span>
      )}
      {status.premium && <span className="text-primary">· Premium</span>}
    </Link>
  )
}
