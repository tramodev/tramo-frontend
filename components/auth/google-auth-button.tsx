"use client"

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { googleAuthHandler } from "@/lib/google-auth-actions"

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export function GoogleAuthButton({
  text = "continue_with",
}: {
  text?: "signin_with" | "signup_with" | "continue_with"
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

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
    router.push(result.requiresBirthDate ? "/onboarding/birth-date" : "/")
    router.refresh()
  }

  if (!clientId) return null

  return (
    <GoogleOAuthProvider clientId={clientId} locale="en">
      <div ref={containerRef} className="flex w-full flex-col items-center gap-2">
        {width > 0 && <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed. Please try again.")}
          theme="outline"
          shape="pill"
          logo_alignment="center"
          size="large"
          text={text}
          width={width}
        />}
        {error && (
          <p className="text-sm text-center text-destructive">
            {error}
          </p>
        )}
      </div>
    </GoogleOAuthProvider>
  )
}
