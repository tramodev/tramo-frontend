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
        <h1 className="font-display text-[36px] font-normal">Forgot password?</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-[22px]">
        {state?.error && (
          <div className="text-sm text-center text-destructive">
            {state.error}
          </div>
        )}
        <Field floatingLabel>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <Button type="submit" size="xl" disabled={isPending} className="w-full">
            {isPending ? "Sending..." : "Send reset link"}
          </Button>
        </Field>
        <FieldDescription className="text-left">
          Remembered your password?{" "}
          <a href="/login" className="font-medium text-primary">
            Log in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
