// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"
import { startTransition, useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TopProgressBar } from "@/components/layout/top-progress-bar"
import { contactHandler } from "@/app/contact/actions"

const TOPICS = [
  { value: "FEEDBACK", label: "Feedback" },
  { value: "BUG", label: "Bug report" },
  { value: "BILLING", label: "Billing" },
  { value: "OTHER", label: "Other" },
]

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(contactHandler, null)
  const [captchaError, setCaptchaError] = useState("")
  const [checkingCaptcha, setCheckingCaptcha] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    return () => {
      document.querySelector(".grecaptcha-badge")?.remove()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCaptchaError("")
    const form = e.currentTarget
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

    if (!siteKey || !window.grecaptcha) {
      setCaptchaError("Captcha failed to load. Please refresh and try again.")
      return
    }

    setCheckingCaptcha(true)
    try {
      const captchaToken = await new Promise<string>((resolve, reject) => {
        window.grecaptcha!.ready(() => {
          window.grecaptcha!.execute(siteKey, { action: "contact" }).then(resolve, reject)
        })
      })
      const formData = new FormData(form)
      formData.set("captchaToken", captchaToken)
      startTransition(() => formAction(formData))
    } catch {
      setCaptchaError("Captcha verification failed. Please try again.")
    } finally {
      setCheckingCaptcha(false)
    }
  }

  if (state?.sent) {
    return (
      <div role="status" className="rounded-lg border border-border p-6">
        <h2 className="font-display text-2xl font-medium">Message sent</h2>
        <p className="mt-2 text-base leading-7 text-muted-foreground">Thanks for reaching out. We&apos;ll reply to your email.</p>
      </div>
    )
  }

  const error = state?.error || captchaError

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {(isPending || checkingCaptcha) && <TopProgressBar label="Sending message" />}
      <FieldGroup className="gap-[22px]">
        {error && (
          <div role="alert" className="text-sm text-destructive">
            {error}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="contact-email">Email</FieldLabel>
          <Input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-topic">Topic</FieldLabel>
          <select id="contact-topic" name="topic" defaultValue="FEEDBACK" className="h-14 w-full rounded-xs border border-input bg-background px-4 text-base md:text-sm">
            {TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <Textarea
            id="contact-message"
            name="message"
            required
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-40 rounded-xs px-4 py-3"
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/2000</p>
        </Field>
        <Button type="submit" size="xl" disabled={isPending || checkingCaptcha} className="w-full sm:w-auto sm:self-start">
          {isPending || checkingCaptcha ? "Sending..." : "Send message"}
        </Button>
      </FieldGroup>
    </form>
  )
}
