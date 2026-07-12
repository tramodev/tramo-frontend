'use client'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { registerHandler } from "@/app/signup/actions"
import { getPasswordStrength } from "@/lib/password-strength"
import { GoogleAuthButton } from "@/components/google-auth-button"

type Availability = "idle" | "checking" | "available" | "taken"

// Matches the backend's own constraints (RegisterRequestDTO) so we only fire
// a check once the value could plausibly be valid, not on every keystroke.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "checking" is derived (no resolved result yet for the current value) rather than
// stored, so the effect never calls setState synchronously — only inside the
// fetch's then/catch, once the debounced check actually resolves.
function useAvailabilityCheck(
  value: string,
  pattern: RegExp,
  endpoint: string,
  param: "username" | "email"
): Availability {
  const [result, setResult] = useState<{ value: string; status: Availability } | null>(null)

  useEffect(() => {
    if (!pattern.test(value)) return;

    const timeout = setTimeout(() => {
      fetch(`${endpoint}?${param}=${encodeURIComponent(value)}`)
        .then((response) => response.json())
        .then((data) => setResult({ value, status: data.available ? "available" : "taken" }))
        .catch(() => setResult({ value, status: "idle" }));
    }, 500)

    return () => clearTimeout(timeout)
  }, [value, pattern, endpoint, param])

  if (!pattern.test(value)) return "idle"
  if (result && result.value === value) return result.status
  return "checking"
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction, isPending] = useActionState(registerHandler, null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const strength = getPasswordStrength(password);
  const errors = state?.errors;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const usernameAvailability = useAvailabilityCheck(
    username,
    USERNAME_PATTERN,
    "/api/auth/check-username",
    "username"
  );
  const emailAvailability = useAvailabilityCheck(email, EMAIL_PATTERN, "/api/auth/check-email", "email");
  return (
    <form action={formAction} className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <h1 className="text-[40px] font-extrabold" style={{ letterSpacing: "-0.015em", marginLeft: "-0.058em" }}>
          Create your account
        </h1>
        <p className="mt-3.5 text-[15px]" style={{ lineHeight: "28px", color: "var(--color-neutral-800)" }}>
          Fill in the form below to create your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-6">
        {errors?.general && (
          <div className="text-sm text-center" style={{ color: "var(--color-accent-700)" }}>
            {errors.general}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <div className="relative">
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="JohnDoe123"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors?.username || usernameAvailability === "taken"}
              className={usernameAvailability !== "idle" ? "pr-9" : undefined}
            />
            {usernameAvailability === "checking" && (
              <Loader2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500" />
            )}
            {usernameAvailability === "available" && (
              <CheckCircle2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            )}
          </div>
          {errors?.username ? (
            <FieldError>{errors.username}</FieldError>
          ) : usernameAvailability === "taken" ? (
            <FieldError>Username is already taken</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors?.email || emailAvailability === "taken"}
              className={emailAvailability !== "idle" ? "pr-9" : undefined}
            />
            {emailAvailability === "checking" && (
              <Loader2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500" />
            )}
            {emailAvailability === "available" && (
              <CheckCircle2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            )}
          </div>
          {errors?.email ? (
            <FieldError>{errors.email}</FieldError>
          ) : emailAvailability === "taken" ? (
            <FieldError>Email is already registered</FieldError>
          ) : (
            <FieldDescription>
              We&apos;ll use this to contact you. We will not share your email
              with anyone else.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors?.password}
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
          {errors?.password ? (
            <FieldError>{errors.password}</FieldError>
          ) : (
            <FieldDescription>
              Must be at least 6 characters and include an uppercase letter, a number, and a symbol.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!errors?.confirmPassword}
              className={passwordsMatch ? "pr-9" : undefined}
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-emerald-600" />
            )}
          </div>
          {errors?.confirmPassword ? (
            <FieldError>{errors.confirmPassword}</FieldError>
          ) : (
            <FieldDescription>Please confirm your password.</FieldDescription>
          )}
        </Field>
        <Field>
          <Button type="submit" disabled={isPending} className="w-full justify-start">
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </Field>
        <FieldSeparator>
          <span
            className="text-[11px] uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
          >
            Or continue with
          </span>
        </FieldSeparator>
        <Field>
          <GoogleAuthButton text="signup_with" />
          <FieldDescription className="text-left">
            Already have an account?{" "}
            <a href="login" className="font-semibold" style={{ color: "var(--color-accent-700)" }}>
              Sign in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
