// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState, useTransition } from "react"
import { Heart, CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cancelSubscription, type SubscriptionStatus } from "@/lib/subscription"
import { formatBytes } from "@/lib/format-bytes"
import { getPatreonAuthorizeUrl } from "@/lib/patreon"

function Meter({ label, used, total, pct }: { label: string; used: string; total: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{used} / {total}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function PlanPanel({ initialStatus }: { initialStatus: SubscriptionStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const storagePct = Math.min(100, (status.storageUsedBytes / status.storageQuotaBytes) * 100)

  return (
    <>
      <section>
        <h2 className="mb-1 text-lg font-medium inline-flex items-center gap-2">
          {status.supporter ? <>Supporter <Heart className="h-4 w-4 text-primary" /></> : "Free plan"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {status.supporter
            ? "Thanks for supporting Tramo. Your limits are lifted."
            : "The free plan covers everyday use. Here's where you stand."}
        </p>

        <div className="flex flex-col gap-5">
          <Meter
            label="Storage"
            used={formatBytes(status.storageUsedBytes)}
            total={formatBytes(status.storageQuotaBytes)}
            pct={storagePct}
          />
        </div>
      </section>

      {status.supporter ? (
        <section>
          <Button variant="outline" disabled={pending} onClick={() => setCancelOpen(true)}>
            Cancel subscription
          </Button>
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            title="Cancel subscription?"
            description="You keep everything you've made — you just go back to free-plan limits for new uploads."
            confirmLabel="Cancel subscription"
            onConfirm={() => startTransition(async () => setStatus(await cancelSubscription()))}
          />
        </section>
      ) : (
        <section className="rounded-2xl bg-accent p-6 text-accent-foreground">
          <h3 className="mb-1 inline-flex items-center gap-2 text-base font-medium">
            <Heart className="h-4 w-4" />
            Tramo Supporter
          </h3>
          <p className="mb-4 text-sm opacity-[85%]">More space, so nothing gets in the way.</p>
          <div className="mb-5 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4" />
              10GB storage
            </div>
          </div>
          <Button
            disabled={pending}
            onClick={() => startTransition(async () => {
              window.location.href = await getPatreonAuthorizeUrl()
            })}
          >
            Connect with Patreon
          </Button>
        </section>
      )}
    </>
  )
}
