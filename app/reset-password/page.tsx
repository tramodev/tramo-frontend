import { Suspense } from "react"
import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"
import { ResetPasswordClient } from "./reset-password-client"

export default function ResetPasswordPage() {
  return (
    <div className={`modernist grid min-h-svh lg:grid-cols-2 ${archivo.className}`}>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center">
          <Suspense fallback={null}>
            <ResetPasswordClient />
          </Suspense>
        </div>
      </div>
      <AuthPoster lines={["New start,", "new password."]} />
    </div>
  )
}
