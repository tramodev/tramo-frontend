// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HardDrive } from "lucide-react"
import { getSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription"
import { formatBytes } from "@/lib/format-bytes"

export function PlanUsageChip({ className }: { className?: string }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    getSubscriptionStatus().then(setStatus).catch(() => {})
  }, [])

  if (!status) return <div className={`h-7 w-28 rounded-full border border-input bg-secondary ${className ?? ""}`} />;

  return (
    <Link
      href="/settings?tab=plan"
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border border-input bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted ${className ?? ""}`}
    >
      <HardDrive className="h-3.5 w-3.5" />
      {formatBytes(status.storageUsedBytes)} / {formatBytes(status.storageQuotaBytes)}
      {status.supporter && <span className="text-primary">· Supporter</span>}
    </Link>
  )
}
