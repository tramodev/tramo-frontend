import { ArrowRight } from "lucide-react"
import type { Trail } from "@/app/editor/types"

export function NextTrailButton({ trail, onSelectTrail, children }: {
  trail: Pick<Trail, "id" | "title">
  onSelectTrail: (trailId: string) => void
  children?: React.ReactNode
}) {
  return <div className="mt-8 flex justify-end pl-7">
    <button type="button" onClick={() => onSelectTrail(trail.id)} className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
      <span className="min-w-0 [overflow-wrap:anywhere]">Next trail: {trail.title}</span> {children}
      <ArrowRight className="h-4 w-4 shrink-0" />
    </button>
  </div>
}
