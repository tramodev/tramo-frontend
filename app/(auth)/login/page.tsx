// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { AuthPoster } from "@/components/auth/auth-poster"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Tramo account to keep building and sharing your trails.",
}

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <LoginForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="trail" title="Find your path" subtitle="One idea at a time, until it all connects" />
    </>
  )
}
