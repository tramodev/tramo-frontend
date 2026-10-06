// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { BirthDateForm } from "@/components/auth/birth-date-form"
import { AuthPoster } from "@/components/auth/auth-poster"

export const metadata: Metadata = {
  title: "One more step",
  robots: { index: false, follow: false },
}

export default function BirthDateOnboardingPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <BirthDateForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="cards" title="Almost there" subtitle="Just one more detail before you're in" />
    </>
  )
}
