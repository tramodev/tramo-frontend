import Link from "next/link"

export function AuthPromptActions({ className = "" }: { className?: string }) {
  return (
    <div className={`relative z-10 flex items-center gap-1.5 text-xs font-semibold ${className}`}>
      <Link href="/login" className="hover:text-[var(--color-accent)] text-(--color-neutral-700)">
        Sign in
      </Link>
      <span className="text-(--color-divider)">·</span>
      <Link href="/signup" className="text-(--color-accent)">
        Sign up
      </Link>
    </div>
  )
}
