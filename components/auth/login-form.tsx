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
import { ResendVerificationButton } from "@/components/auth/resend-verification-button"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"
import { useActionState, useState } from 'react';

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" size="xl" disabled={isPending} className="w-full">
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
        <h1 className="font-display text-[36px] font-normal">Log in</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          Enter your username below to access your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-[22px]">
        {state?.error && (
          <div className="flex flex-col items-center gap-2 text-sm text-center text-destructive">
            {state.error}
            {state.needsVerification && (
              <ResendVerificationButton username={username} />
            )}
          </div>
        )}
        <Field floatingLabel>
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
        <div className="flex flex-col gap-2">
          <Field floatingLabel>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input id="password" name="password" type="password" placeholder=" " required />
          </Field>
          <a
            href="/forgot-password"
            className="self-end text-[13px] font-medium text-primary"
          >
            Forgot your password?
          </a>
        </div>
        <Field>
          <SubmitButton isPending={isPending} />
        </Field>
        <FieldSeparator>
          <span className="text-xs font-medium text-muted-foreground">
            Or continue with
          </span>
        </FieldSeparator>
        <Field>
          <GoogleAuthButton text="signin_with" />
          <FieldDescription className="text-left">
            Don&apos;t have an account?{" "}
            <a href="signup" className="font-medium text-primary">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
