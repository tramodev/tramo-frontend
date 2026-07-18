import { cn } from "@/lib/utils"

/** Tramo mark — branching trail in an M3 container. */
export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center bg-primary", className)}
      style={{ width: size, height: size, borderRadius: size * 0.31 }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 32 32">
        <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="25" cy="7.5" r="4" fill="#C3E8FF" />
        <circle cx="7.5" cy="14.5" r="3.1" fill="none" stroke="#C3E8FF" strokeWidth="3.2" />
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

/** Glyph only, brand blue — for places without the container. */
export function Glyph({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="25" cy="7.5" r="3.8" fill="currentColor" />
      <circle cx="7.5" cy="14.5" r="3" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}
