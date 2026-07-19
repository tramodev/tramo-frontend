import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { AuthPoster } from "@/components/auth-poster"
import { Wordmark } from "@/components/logo"

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Link href="/" className="mb-10">
          <Wordmark />
        </Link>
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <LoginForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="trail" title="Find your path" subtitle="One idea at a time, until it all connects" />
    </>
  )
}
