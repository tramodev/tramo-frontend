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
        <XCircle className="h-8 w-8 text-destructive" />
        <p className="text-[15px] text-muted-foreground">
          Missing reset token.
        </p>
        <a href="/forgot-password" className="text-sm font-semibold text-primary">
          Request a new link
        </a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-start gap-4">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-[15px] text-muted-foreground">
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
        <h1 className="font-display text-[36px] font-normal">
          Reset password
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-[22px]">
        {error && (
          <div className="text-sm text-center text-destructive">
            {error}
          </div>
        )}
        <Field floatingLabel>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder=" "
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
                      i < strength.filled ? strength.barColor : "bg-surface-container-highest"
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
        <Field floatingLabel>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              placeholder=" "
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={passwordsMatch ? "pr-9" : undefined}
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-success" />
            )}
          </div>
          {!passwordsMatch && confirmPassword.length > 0 && (
            <FieldError>Passwords do not match</FieldError>
          )}
        </Field>
        <Field>
          <Button type="submit" size="xl" disabled={isPending} className="w-full">
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
