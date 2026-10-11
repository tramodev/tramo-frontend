import { Link2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Trail } from "@/app/editor/types"

export function SharedNoteIndicator({ trails, readOnly = false }: {
  trails: Pick<Trail, "title">[]
  readOnly?: boolean
}) {
  if (trails.length < 2) return null

  return <Tooltip>
    <TooltipTrigger asChild>
      <Link2 aria-label={`Used in ${trails.length} trails`} className="ml-auto h-3 w-3 shrink-0 text-primary" />
    </TooltipTrigger>
    <TooltipContent className="max-w-56">
      <p className="font-medium">Used in {trails.length} trails: {trails.map(trail => trail.title).join(", ")}</p>
      {!readOnly && <p className="mt-1 text-muted-foreground">Edits appear in every trail that uses this note.</p>}
    </TooltipContent>
  </Tooltip>
}
