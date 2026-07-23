import { Suspense } from "react"
import { Wordmark } from "@/components/layout/logo"
import { AuthPoster } from "@/components/auth/auth-poster"
import { VerifyEmailClient } from "./verify-email-client"

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
