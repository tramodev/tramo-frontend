import { MailCheck } from "lucide-react"
import { Wordmark } from "@/components/logo"
import { AuthPoster } from "@/components/auth-poster"

export default async function ForgotPasswordCheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark className="mb-10" />
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex w-full max-w-[400px] flex-col gap-6">
            <MailCheck className="h-10 w-10 text-primary" />
            <div>
              <h1 className="font-display text-[32px] font-normal">
                Check your email
              </h1>
              <p className="mt-3.5 text-[15px] leading-7 text-muted-foreground">
                {email ? (
                  <>If an account exists for <strong>{email}</strong>, we sent a link to reset your password.</>
                ) : (
                  "If an account exists for that email, we sent a link to reset your password."
                )}
              </p>
            </div>
            <a href="/login" className="text-sm font-medium text-primary">
              Back to log in
            </a>
          </div>
        </div>
      </div>
      <AuthPoster lines={["Almost there,", "check your inbox."]} />
    </>
  )
}
