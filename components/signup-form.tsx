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
import { registerHandler } from "@/app/(auth)/signup/actions"
import { getPasswordStrength } from "@/lib/password-strength"
import { GoogleAuthButton } from "@/components/google-auth-button"

type Availability = "idle" | "checking" | "available" | "taken"

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
        <h1 className="font-display text-[36px] font-normal">Create your account</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          Fill in the form below to create your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-[22px]">
        {errors?.general && (
          <div className="text-sm text-center text-destructive">
            {errors.general}
          </div>
        )}
        <Field floatingLabel>
          <FieldLabel
            htmlFor="username"
            style={usernameAvailability === "available" ? { color: "var(--primary)" } : undefined}
          >
            Username
          </FieldLabel>
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
              <Loader2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {usernameAvailability === "available" && (
              <CheckCircle2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-success" />
            )}
          </div>
          {errors?.username ? (
            <FieldError>{errors.username}</FieldError>
          ) : usernameAvailability === "taken" ? (
            <FieldError>Username is already taken</FieldError>
          ) : usernameAvailability === "available" ? (
            <FieldDescription className="text-success">Username is available</FieldDescription>
          ) : null}
        </Field>
        <Field floatingLabel>
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
              <Loader2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {emailAvailability === "available" && (
              <CheckCircle2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-success" />
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
        <Field floatingLabel>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder=" "
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
          {errors?.password ? (
            <FieldError>{errors.password}</FieldError>
          ) : (
            <FieldDescription>
              Must be at least 6 characters and include an uppercase letter, a number, and a symbol.
            </FieldDescription>
          )}
        </Field>
        <Field floatingLabel>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              placeholder=" "
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!errors?.confirmPassword}
              className={passwordsMatch ? "pr-9" : undefined}
            />
            {passwordsMatch && (
              <CheckCircle2 className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-success" />
            )}
          </div>
          {errors?.confirmPassword ? (
            <FieldError>{errors.confirmPassword}</FieldError>
          ) : (
            <FieldDescription>Please confirm your password.</FieldDescription>
          )}
        </Field>
        <Field>
          <Button type="submit" size="xl" disabled={isPending} className="w-full">
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </Field>
        <FieldSeparator>
          <span className="text-xs font-medium text-muted-foreground">
            Or continue with
          </span>
        </FieldSeparator>
        <Field>
          <GoogleAuthButton text="signup_with" />
          <FieldDescription className="text-left">
            Already have an account?{" "}
            <a href="login" className="font-medium text-primary">
              Sign in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
