// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthPoster } from "@/components/auth/auth-poster"
import { Wordmark } from "@/components/layout/logo"

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark className="mb-10" />
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="trail" title="Happens to everyone" subtitle="We'll get you back in" />
    </>
  )
}
