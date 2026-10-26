// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { PatreonButton } from "@/components/profile/patreon-button"

export function PatreonSupportCard() {
  const [supporter, setSupporter] = useState(false)
  if (supporter) return null

  return (
    <div className="rounded-2xl bg-accent p-5 text-accent-foreground">
      <h2 className="mb-1 text-lg font-medium">
        Support Tramo
      </h2>
      <p className="mb-4 text-sm opacity-[85%]">
        Tramo is built and run independently. If it&apos;s useful to you, becoming a
        Patreon supporter helps us keep building and grow the platform.
      </p>
      <PatreonButton onSupporter={() => setSupporter(true)} />
    </div>
  )
}
