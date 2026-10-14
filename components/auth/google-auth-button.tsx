// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from "@react-oauth/google"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { googleAuthHandler } from "@/lib/google-auth-actions"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export function GoogleAuthButton({
  text = "continue_with",
}: {
  text?: "signin_with" | "signup_with" | "continue_with"
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [idToken, setIdToken] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
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

  const signIn = async (credential: string, existingPassword?: string) => {
    setIsPending(true)
    setError("")
    try {
      const result = await googleAuthHandler(credential, existingPassword)
      if (!result.success) {
        setError(result.error)
        if (result.linkRequired) setIdToken(credential)
        return
      }
      router.push(result.requiresBirthDate ? "/onboarding/birth-date" : "/")
      router.refresh()
    } catch {
      setError("Google sign-in failed. Please try again.")
    } finally {
      setPassword("")
      setIsPending(false)
    }
  }

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in failed. Please try again.")
      return
    }
    setIdToken("")
    await signIn(credentialResponse.credential)
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
        {idToken && (
          <div className="flex w-full flex-col gap-2">
            <Field floatingLabel>
              <FieldLabel htmlFor="google-link-password">Existing account password</FieldLabel>
              <Input
                id="google-link-password"
                type="password"
                autoComplete="current-password"
                maxLength={40}
                placeholder=" "
                value={password}
                disabled={isPending}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    if (password && !isPending) void signIn(idToken, password)
                  }
                }}
              />
            </Field>
            <Button type="button" disabled={!password || isPending} onClick={() => signIn(idToken, password)}>
              {isPending ? "Linking..." : "Link Google and sign in"}
            </Button>
            <a href="/forgot-password" className="text-sm text-primary">Reset password or recover a Google-only account</a>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-center text-destructive">
            {error}
          </p>
        )}
      </div>
    </GoogleOAuthProvider>
  )
}
