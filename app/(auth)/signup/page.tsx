import Link from "next/link"
import { SignupForm } from "@/components/signup-form"
import { AuthPoster } from "@/components/auth-poster"
import { Wordmark } from "@/components/logo"

export default function SignupPage() {
  return (
    <>
      <div className="flex flex-col px-8 py-8 lg:px-24">
        <Link href="/" className="mb-10">
          <Wordmark />
        </Link>
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-[400px]">
            <SignupForm />
          </div>
        </div>
      </div>
      <AuthPoster variant="cards" title="Every idea finds its place" subtitle="Collect, connect, and retrace your thinking" />
    </>
  )
}
