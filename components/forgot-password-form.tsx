"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { forgotPasswordHandler } from "@/app/(auth)/forgot-password/actions"
import { useActionState } from "react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction, isPending] = useActionState(forgotPasswordHandler, null)

  return (
    <form action={formAction} className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <h1 className="text-[40px] font-extrabold tracking-[-0.015em] ml-[-0.058em]">
          Forgot password?
        </h1>
        <p className="mt-3.5 text-[15px] leading-7 text-(--color-neutral-800)">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-6">
        {state?.error && (
          <div className="text-sm text-center text-(--color-accent-700)">
            {state.error}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <Button type="submit" disabled={isPending} className="w-full justify-start">
            {isPending ? "Sending..." : "Send reset link"}
          </Button>
        </Field>
        <FieldDescription className="text-left">
          Remembered your password?{" "}
          <a href="/login" className="font-semibold text-(--color-accent-700)">
            Log in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
