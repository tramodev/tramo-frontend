// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { submitBirthDateHandler } from "@/app/(auth)/onboarding/birth-date/actions"

export function BirthDateForm() {
  const [state, formAction, isPending] = useActionState(submitBirthDateHandler, null)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[36px] font-normal">One more thing</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
          We need your date of birth to finish setting up your account.
        </p>
      </div>
      <FieldGroup className="mt-2 gap-[22px]">
        <Field>
          <FieldLabel htmlFor="birthDate">Date of birth</FieldLabel>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            required
            max={new Date().toISOString().split("T")[0]}
            aria-invalid={!!state?.error}
          />
          {state?.error ? (
            <FieldError>{state.error}</FieldError>
          ) : (
            <FieldDescription>You must be at least 13 years old to use tramo.</FieldDescription>
          )}
        </Field>
        <Field>
          <Button type="submit" size="xl" disabled={isPending} className="w-full">
            {isPending ? "Saving..." : "Continue"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
