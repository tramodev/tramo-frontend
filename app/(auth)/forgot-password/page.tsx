import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { AuthPoster } from "@/components/auth-poster"
import { Wordmark } from "@/components/logo"

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark className="mb-10" />
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <AuthPoster lines={["Happens to,", "everyone."]} />
    </>
  )
}
