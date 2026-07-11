import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { LoginForm } from "@/components/login-form"
import { AuthPoster } from "@/components/auth-poster"
import { Wordmark } from "@/components/logo"

export default function LoginPage() {
  return (
    <div className={`modernist grid min-h-svh lg:grid-cols-2 ${archivo.className}`}>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <LoginForm />
          </div>
        </div>
      </div>
      <AuthPoster lines={["Organize ideas,", "not files."]} />
    </div>
  )
}
