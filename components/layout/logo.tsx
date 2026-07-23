import { cn } from "@/lib/utils"

export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "var(--primary)" }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 32 32">
        <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="var(--primary-foreground)" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="var(--primary-foreground)" strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="25" cy="7.5" r="4.4" fill="var(--primary-foreground)" />
        <circle cx="7.5" cy="14.5" r="3.4" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.8" />
      </svg>
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Mark />
      <span className="font-display font-semibold text-2xl tracking-tight">Tramo</span>
    </span>
  )
}
