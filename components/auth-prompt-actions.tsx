import Link from "next/link"

export function AuthPromptActions({ className = "" }: { className?: string }) {
  return (
    <div className={`relative z-10 flex items-center gap-1.5 text-xs font-semibold ${className}`}>
      <Link href="/login" className="hover:text-[var(--color-accent)]" style={{ color: "var(--color-neutral-700)" }}>
        Sign in
      </Link>
      <span style={{ color: "var(--color-divider)" }}>·</span>
      <Link href="/signup" style={{ color: "var(--color-accent)" }}>
        Sign up
      </Link>
    </div>
  )
}
