import Link from "next/link"

export function AuthPromptActions({ className = "" }: { className?: string }) {
  return (
    <div className={`relative z-10 flex items-center gap-1.5 text-xs font-semibold ${className}`}>
      <Link href="/login" className="hover:text-primary text-muted-foreground">
        Sign in
      </Link>
      <span className="text-border">·</span>
      <Link href="/signup" className="text-primary">
        Sign up
      </Link>
    </div>
  )
}
