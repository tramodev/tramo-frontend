"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { mockUpgrade, cancelSubscription, type SubscriptionStatus } from "@/lib/subscription"

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

function Meter({ label, used, total }: { label: string; used: string; total: string; }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{used} / {total}</span>
    </div>
  )
}

export function PlanPanel({ initialStatus }: { initialStatus: SubscriptionStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const storagePct = Math.min(100, (status.storageUsedBytes / status.storageQuotaBytes) * 100)

  return (
    <div className="flex flex-col gap-10 max-w-[480px]">
      <section>
        <h2 className="mb-1 text-lg font-medium inline-flex items-center gap-2">
          {status.premium ? <>Premium <Heart className="h-4 w-4 text-primary" /></> : "Free plan"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {status.premium
            ? "Thanks for supporting Tramo. Your limits are lifted."
            : "The free plan covers everyday use. Upgrade for more space and unlimited publishing."}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <Meter
              label="Storage (images)"
              used={formatBytes(status.storageUsedBytes)}
              total={formatBytes(status.storageQuotaBytes)}
            />
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${storagePct}%` }} />
            </div>
          </div>
          <Meter
            label="Publishes this week"
            used={String(status.publishesUsedThisWeek)}
            total={status.publishesPerWeek === -1 ? "unlimited" : String(status.publishesPerWeek)}
          />
        </div>
      </section>

      <section>
        {status.premium ? (
          <>
            <Button variant="outline" disabled={pending} onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
            <ConfirmDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              title="Cancel subscription?"
              description="You keep everything you've made — you just go back to free-plan limits for new uploads and publishes."
              confirmLabel="Cancel subscription"
              onConfirm={() => startTransition(async () => setStatus(await cancelSubscription()))}
            />
          </>
        ) : (
          <Button disabled={pending} onClick={() => startTransition(async () => setStatus(await mockUpgrade()))}>
            Upgrade (test)
          </Button>
        )}
      </section>
    </div>
  )
}
