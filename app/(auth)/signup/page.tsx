// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import Script from "next/script"
import { SignupForm } from "@/components/auth/signup-form"
import { AuthPoster } from "@/components/auth/auth-poster"

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free Tramo account and start mapping your ideas.",
}

export default function SignupPage() {
  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
      />
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <SignupForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="cards" title="Every idea finds its place" subtitle="Collect, connect, and retrace your thinking" />
    </>
  )
}
