// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState, useTransition } from "react"
import { Heart, CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cancelSubscription, type SubscriptionStatus } from "@/lib/subscription"
import { formatBytes } from "@/lib/format-bytes"
import { PatreonButton } from "@/components/profile/patreon-button"

export function StorageMeter({ status }: { status: Pick<SubscriptionStatus, "storageUsedBytes" | "storageImageBytes" | "storageTextBytes"> & { storageQuotaBytes?: number } }) {
  const quota = status.storageQuotaBytes ?? status.storageUsedBytes
  const scale = Math.max(quota, status.storageUsedBytes, 1)
  const pct = Math.min(100, status.storageUsedBytes / Math.max(quota, 1) * 100)
  const images = formatBytes(status.storageImageBytes)
  const text = formatBytes(status.storageTextBytes)
  const used = formatBytes(status.storageUsedBytes)
  const total = status.storageQuotaBytes === undefined ? used : `${used} / ${formatBytes(status.storageQuotaBytes)}`

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Storage</span>
        <span className="font-medium tabular-nums">{total}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Storage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${total}. Images: ${images}. Text: ${text}.`}
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted"
      >
        <div aria-hidden="true" className="h-full shrink-0 bg-chart-1" style={{ width: `${status.storageImageBytes / scale * 100}%` }} />
        <div aria-hidden="true" className="h-full shrink-0 bg-chart-2" style={{ width: `${status.storageTextBytes / scale * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-chart-1" />
          Images <span className="tabular-nums">{images}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-chart-2" />
          Text <span className="tabular-nums">{text}</span>
        </span>
      </div>
    </div>
  )
}

export function PlanPanel({ initialStatus, patreonStatus }: { initialStatus: SubscriptionStatus; patreonStatus?: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      {patreonStatus === "error" && <p role="alert" className="text-sm text-destructive">Patreon connection wasn’t completed. Please try again.</p>}
      <section>
        <h2 className="mb-1 text-lg font-medium inline-flex items-center gap-2">
          {status.supporter ? <>Supporter <Heart className="h-4 w-4 text-primary" /></> : "Free plan"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {status.supporter
            ? "Supporter active. Thanks for supporting Tramo. Your limits are lifted."
            : "The free plan covers everyday use. Here's where you stand."}
        </p>

        <div className="flex flex-col gap-5">
          <StorageMeter status={status} />
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
            {['10GB storage', 'Animated GIF avatar', 'Profile banner', 'Supporter badge on your profile'].map(feature => (
              <div key={feature} className="flex items-center gap-2">
                <CircleCheck className="h-4 w-4 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
          <PatreonButton onSupporter={setStatus} />
        </section>
      )}
    </>
  )
}
