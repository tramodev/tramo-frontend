import { Suspense } from "react"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"
import { ResetPasswordClient } from "./reset-password-client"

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
