import { Suspense } from "react"
import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"
import { VerifyEmailClient } from "./verify-email-client"

export default function VerifyEmailPage() {
  return (
    <div className={`modernist grid min-h-svh lg:grid-cols-2 ${archivo.className}`}>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center">
          <Suspense fallback={null}>
            <VerifyEmailClient />
          </Suspense>
        </div>
      </div>
      <AuthPoster lines={["Verifying,", "one moment."]} />
    </div>
  )
}
