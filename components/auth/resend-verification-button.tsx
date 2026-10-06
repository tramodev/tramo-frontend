// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { resendVerificationHandler } from "@/lib/verification-actions"

export function ResendVerificationButton({
  username,
  email,
}: {
  username?: string
  email?: string
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")

  const handleClick = async () => {
    setStatus("sending")
    await resendVerificationHandler({ username, email })
    setStatus("sent")
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={status !== "idle"}
      onClick={handleClick}
    >
      {status === "idle" && "Resend verification email"}
      {status === "sending" && "Sending..."}
      {status === "sent" && "Email sent"}
    </Button>
  )
}
