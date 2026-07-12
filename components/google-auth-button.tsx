"use client"

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { googleAuthHandler } from "@/lib/google-auth-actions"

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export function GoogleAuthButton({
  text = "continue_with",
}: {
  text?: "signin_with" | "signup_with" | "continue_with"
}) {
  const router = useRouter()
  const [error, setError] = useState("")

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in failed. Please try again.")
      return
    }
    const result = await googleAuthHandler(credentialResponse.credential)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.push("/")
    router.refresh()
  }

  if (!clientId) return null

  return (
    <GoogleOAuthProvider clientId={clientId} locale="en">
      <div className="flex w-full flex-col items-center gap-2">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed. Please try again.")}
          theme="outline"
          shape="rectangular"
          size="large"
          text={text}
          width={400}
        />
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--color-accent-700)" }}>
            {error}
          </p>
        )}
      </div>
    </GoogleOAuthProvider>
  )
}
