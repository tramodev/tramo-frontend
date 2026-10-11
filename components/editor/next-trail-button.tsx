import { ArrowRight } from "lucide-react"
import type { Trail } from "@/app/editor/types"

export function NextTrailButton({ trail, onSelectTrail, children }: {
  trail: Pick<Trail, "id" | "title">
  onSelectTrail: (trailId: string) => void
  children?: React.ReactNode
}) {
  return <div className="mt-8 flex justify-end pl-7">
    <button type="button" onClick={() => onSelectTrail(trail.id)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
      Next trail: {trail.title} {children}
      <ArrowRight className="h-4 w-4" />
    </button>
  </div>
}
