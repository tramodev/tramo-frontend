// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { Suspense } from "react"
import { Wordmark } from "@/components/layout/logo"
import { AuthPoster } from "@/components/auth/auth-poster"
import { ResetPasswordClient } from "./reset-password-client"

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark className="mb-10" />
        <div className="flex flex-1 flex-col justify-center">
          <Suspense fallback={null}>
            <ResetPasswordClient />
          </Suspense>
        </div>
      </div>
      <AuthPoster variant="trail" title="New start" subtitle="Set a new password" />
    </>
  )
}
