import { MailCheck } from "lucide-react"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"
import { ResendVerificationButton } from "@/components/resend-verification-button"

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <>
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
                  <>We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</>
                ) : (
                  "We sent a verification link to your email. Click it to activate your account."
                )}
              </p>
            </div>
            {email && <ResendVerificationButton email={email} />}
          </div>
        </div>
      </div>
      <AuthPoster lines={["Almost there,", "check your inbox."]} />
    </>
  )
}
