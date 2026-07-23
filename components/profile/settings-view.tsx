"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { changePassword, deleteAccount } from "@/lib/account"
import { getPasswordStrength } from "@/lib/password-strength"
import { setEmailDigestFrequency, type EmailDigestFrequency } from "@/lib/notifications-prefs"

const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/

const DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const

export function SettingsView({ initialDigest }: { initialDigest: EmailDigestFrequency }) {
  return (
    <>
      <EmailDigestSection initialDigest={initialDigest} />
      <ChangePasswordSection />
      <DangerZoneSection />
    </>
  )
}

function EmailDigestSection({ initialDigest }: { initialDigest: EmailDigestFrequency }) {
  const [digest, setDigest] = useState<EmailDigestFrequency>(initialDigest)
  const [error, setError] = useState(false)
  const [, startTransition] = useTransition()

  function handleChange(value: EmailDigestFrequency) {
    const prev = digest
    setDigest(value)
    setError(false)
    startTransition(async () => {
      const result = await setEmailDigestFrequency(value)
      if (result.error) {
        setDigest(prev)
        setError(true)
      }
    })
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">Email digest</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        A summary of activity across your projects, bundled into one email.
      </p>
      {error && <div className="mb-2 text-sm text-destructive">Couldn&apos;t save that change, try again.</div>}
      <SegmentedControl options={DIGEST_OPTIONS} value={digest} onChange={handleChange} />
    </section>
  )
}

function ChangePasswordSection() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const strength = getPasswordStrength(newPassword)

  if (success) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-medium">Password</h2>
        <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Password changed. Redirecting to log in...
        </div>
      </section>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!PASSWORD_COMPLEXITY_PATTERN.test(newPassword)) {
      setError("Password must contain at least one uppercase letter, one number, and one symbol")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError("")
    setIsPending(true)
    const result = await changePassword(currentPassword, newPassword)
    setIsPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium">Password</h2>
      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-[22px]">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Field floatingLabel>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              type="password"
              placeholder=" "
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field floatingLabel>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              placeholder=" "
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newPassword && (
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
                <span className={cn("text-xs font-medium", strength.textColor)}>{strength.label}</span>
              </div>
            )}
            <FieldDescription>
              Must be at least 6 characters and include an uppercase letter, a number, and a symbol.
            </FieldDescription>
          </Field>
          <Field floatingLabel>
            <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
            <div className="relative">
              <Input
                id="confirm-new-password"
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
            {!passwordsMatch && confirmPassword.length > 0 && <FieldError>Passwords do not match</FieldError>}
          </Field>
          <Field>
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Saving..." : "Change password"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </section>
  )
}

function DangerZoneSection() {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    setConfirmOpen(false)
    setIsPending(true)
    const result = await deleteAccount()
    setIsPending(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    router.push("/")
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium text-destructive">Danger zone</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Deleting your account permanently removes your projects, votes, bookmarks, and follows. This can&apos;t be undone.
      </p>
      {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        className="border-destructive text-destructive hover:bg-destructive/8"
      >
        {isPending ? "Deleting..." : "Delete account"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        description="This will permanently delete your account, projects, and all associated data. This can't be undone."
        confirmLabel="Delete account"
        requireText="DELETE"
        onConfirm={handleDelete}
      />
    </section>
  )
}
