import { cn } from "@/lib/utils"

/**
 * Tramo auth poster — right panel of login/signup.
 * variant "trail" (login): one big forking trail, logo language at mural scale.
 * variant "cards"  (signup): note cards linked by a dotted trail.
 */
export function AuthPoster({
  variant = "trail",
  title,
  subtitle,
  className,
}: {
  variant?: "trail" | "cards"
  title: string
  subtitle: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative m-4 hidden flex-col justify-end overflow-hidden rounded-[28px] p-16 lg:flex bg-accent text-accent-foreground",
        className,
      )}
    >
      {variant === "trail" ? <TrailArt /> : <CardsArt />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-accent from-40% to-transparent" />
      <div className="relative leading-[1.12]">
        <div className="font-display text-5xl font-normal">{title}</div>
        <div className="mt-1.5 text-xl font-medium">{subtitle}</div>
      </div>
    </div>
  )
}

export function TrailArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 688 868" fill="none" preserveAspectRatio="xMidYMid slice">
      <path d="M-40 780 C 120 720, 180 640, 210 520 C 235 420, 300 370, 400 350" className="stroke-primary" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      <path d="M400 350 C 490 332, 540 260, 560 170" className="stroke-primary" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      <path d="M400 350 C 480 366, 530 420, 556 480" className="stroke-primary" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      <path d="M210 520 C 160 470, 150 420, 168 360" className="stroke-primary" strokeWidth="10" strokeLinecap="round" opacity="0.55" />
      <circle cx="566" cy="140" r="16" className="fill-primary" />
      <circle cx="562" cy="494" r="12" className="stroke-primary" fill="none" strokeWidth="9" />
      <circle cx="172" cy="346" r="10" className="stroke-primary" fill="none" strokeWidth="8" opacity="0.55" />
    </svg>
  )
}

function CardsArt() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 688 868" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d="M180 620 C 220 520, 300 490, 360 430 C 420 372, 430 300, 490 250" className="stroke-primary" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 16" />
      </svg>
      <NoteCard className="left-[13%] top-[56%] w-[29%] -rotate-[4deg] bg-white" chip="bg-[#D2E5F5]" />
      <NoteCard className="left-[41%] top-[38%] w-[29%] rotate-[3deg] bg-white" chip="bg-[#E8DDFF]" />
      <div className="absolute left-[61%] top-[17%] w-[30%] -rotate-2 rounded-2xl bg-primary p-5 shadow-md">
        <span className="mb-2.5 inline-flex size-[26px] items-center justify-center rounded-lg bg-white/20">
          <svg width="17" height="17" viewBox="0 0 32 32">
            <path d="M16 29 L16 16 Q16 10 21.5 8.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M16 21 Q16 16.5 11 15.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="25" cy="7.5" r="4" fill="#C3E8FF" />
            <circle cx="7.5" cy="14.5" r="3.1" fill="none" stroke="#C3E8FF" strokeWidth="3.2" />
          </svg>
        </span>
        <div className="h-[7px] rounded-full bg-white/40" />
        <div className="mt-2 h-[7px] w-2/3 rounded-full bg-white/40" />
      </div>
    </>
  )
}

function NoteCard({ className, chip }: { className?: string; chip: string }) {
  return (
    <div className={cn("absolute rounded-2xl p-5 shadow-md", className)}>
      <div className={cn("mb-3 h-2 w-9 rounded-full", chip)} />
      <div className="h-[7px] rounded-full bg-[#EAEEF2]" />
      <div className="mt-2 h-[7px] w-[70%] rounded-full bg-[#EAEEF2]" />
    </div>
  )
}
