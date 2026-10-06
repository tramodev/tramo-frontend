// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { getPatreonAuthorizeUrl } from "@/lib/patreon"

function PatreonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.385.48c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.135.48 15.385.48M.001.48v23.04h4.22V.48z" />
    </svg>
  )
}

export function PatreonSupportCard() {
  const [pending, startTransition] = useTransition()

  return (
    <div className="rounded-2xl bg-accent p-5 text-accent-foreground">
      <h3 className="mb-1 text-lg font-medium">
        Support Tramo
      </h3>
      <p className="mb-4 text-sm opacity-[85%]">
        Tramo is built and run independently. If it&apos;s useful to you, becoming a
        Patreon supporter helps us keep building and grow the platform.
      </p>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          const tab = window.open("", "_blank")
          if (tab) tab.opener = null
          startTransition(async () => {
            const url = await getPatreonAuthorizeUrl()
            if (tab) tab.location.href = url
            else window.location.href = url
          })
        }}
      >
        <PatreonIcon className="h-3.5 w-3.5" />
        Become a supporter
      </Button>
    </div>
  )
}
