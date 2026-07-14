"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authenticateHandler } from "@/app/(auth)/login/actions"
import { ResendVerificationButton } from "@/components/resend-verification-button"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { useActionState, useState } from 'react';

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending} className="w-full justify-start">
      {isPending ? "Logging in..." : "Log in"}
    </Button>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction, isPending] = useActionState(authenticateHandler, null);
  const [username, setUsername] = useState("");

  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div>
        <h1 className="text-[40px] font-extrabold tracking-[-0.015em] ml-[-0.058em]">
          Log in
        </h1>
        <p className="mt-3.5 text-[15px] leading-7 text-(--color-neutral-800)">
          Enter your username below to access your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-6">
        {state?.error && (
          <div className="flex flex-col items-center gap-2 text-sm text-center text-(--color-accent-700)">
            {state.error}
            {state.needsVerification && (
              <ResendVerificationButton username={username} />
            )}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            placeholder="pepito123"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="/forgot-password"
              className="text-[13px] text-(--color-accent-700)"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>
        <Field>
          <SubmitButton isPending={isPending} />
        </Field>
        <FieldSeparator>
          <span
            className="text-[11px] uppercase tracking-[0.08em] text-(--color-neutral-600)"
          >
            Or continue with
          </span>
        </FieldSeparator>
        <Field>
          <GoogleAuthButton text="signin_with" />
          <FieldDescription className="text-left">
            Don&apos;t have an account?{" "}
            <a href="signup" className="font-semibold text-(--color-accent-700)">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
