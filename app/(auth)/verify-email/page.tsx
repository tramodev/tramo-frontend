// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { Suspense } from "react"
import { Wordmark } from "@/components/layout/logo"
import { AuthPoster } from "@/components/auth/auth-poster"
import { VerifyEmailClient } from "./verify-email-client"

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
}

export default function VerifyEmailPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center">
          <Suspense fallback={null}>
            <VerifyEmailClient />
          </Suspense>
        </div>
      </div>
      <AuthPoster variant="trail" title="Verifying" subtitle="Just one moment" />
    </>
  )
}
