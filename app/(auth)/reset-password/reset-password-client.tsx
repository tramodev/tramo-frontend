'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CheckCircle2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPasswordHandler } from "./actions"
import { getPasswordStrength } from "@/lib/password-strength"

const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/

export function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const strength = getPasswordStrength(password)

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => router.push("/login"), 1500)
    return () => clearTimeout(timeout)
  }, [success, router])

  if (!token) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-start gap-4">
        <XCircle className="h-8 w-8 text-red-600" />
        <p className="text-[15px] text-(--color-neutral-800)">
          Missing reset token.
        </p>
        <a href="/forgot-password" className="text-sm font-semibold text-(--color-accent-700)">
          Request a new link
        </a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-start gap-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="text-[15px] text-(--color-neutral-800)">
          Password reset. Redirecting to log in...
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!PASSWORD_COMPLEXITY_PATTERN.test(password)) {
      setError("Password must contain at least one uppercase letter, one number, and one symbol")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError("")
    setIsPending(true)
    const result = await resetPasswordHandler(token, password)
    setIsPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 w-full max-w-[400px]")}>
      <div>
        <h1 className="text-[40px] font-extrabold tracking-[-0.015em] ml-[-0.058em]">
          Reset password
        </h1>
        <p className="mt-3.5 text-[15px] leading-7 text-(--color-neutral-800)">
          Choose a new password for your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-6">
        {error && (
          <div className="text-sm text-center text-(--color-accent-700)">
            {error}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i < strength.filled ? strength.barColor : "bg-neutral-300"
                    )}
                  />
                ))}
              </div>
              <span className={cn("text-xs font-medium", strength.textColor)}>
                {strength.label}
              </span>
            </div>
          )}
          <FieldDescription>
            Must be at least 6 characters and include an uppercase letter, a number, and a symbol.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={passwordsMatch ? "pr-9" : undefined}
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            )}
          </div>
          {!passwordsMatch && confirmPassword.length > 0 && (
            <FieldError>Passwords do not match</FieldError>
          )}
        </Field>
        <Field>
          <Button type="submit" disabled={isPending} className="w-full justify-start">
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
