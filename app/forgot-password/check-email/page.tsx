import { MailCheck } from "lucide-react"
import { archivo } from "@/lib/fonts"
import "../../modernist.css"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"

export default async function ForgotPasswordCheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <div className={`modernist grid min-h-svh lg:grid-cols-2 ${archivo.className}`}>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex w-full max-w-[400px] flex-col gap-6">
            <MailCheck className="h-10 w-10" style={{ color: "var(--color-accent)" }} />
            <div>
              <h1 className="text-[32px] font-extrabold" style={{ letterSpacing: "-0.015em" }}>
                Check your email
              </h1>
              <p className="mt-3.5 text-[15px]" style={{ lineHeight: "28px", color: "var(--color-neutral-800)" }}>
                {email ? (
                  <>If an account exists for <strong>{email}</strong>, we sent a link to reset your password.</>
                ) : (
                  "If an account exists for that email, we sent a link to reset your password."
                )}
              </p>
            </div>
            <a href="/login" className="text-sm font-semibold" style={{ color: "var(--color-accent-700)" }}>
              Back to log in
            </a>
          </div>
        </div>
      </div>
      <AuthPoster lines={["Almost there,", "check your inbox."]} />
    </div>
  )
}
