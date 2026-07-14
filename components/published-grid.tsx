import Link from "next/link"
import { ArrowBigUp, Eye, GitFork } from "lucide-react"
import type { ProjectFeedItem } from "@/lib/public-project"

function formatCardDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function PublishedGrid({
  items,
  hrefFor,
  emptyMessage,
}: {
  items: ProjectFeedItem[]
  hrefFor: (id: string) => string
  emptyMessage: React.ReactNode
}) {
  if (items.length === 0) {
    return <p className="text-sm text-(--color-neutral-600)">{emptyMessage}</p>
  }
  return (
    <div className="grid gap-4 grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={hrefFor(item.id)}
          className="rounded-lg transition-colors hover:bg-muted border-2 border-(--color-divider) py-[18px] px-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.06em] text-(--color-accent)"
            >
              Published
            </span>
            <span className="text-xs text-(--color-neutral-600)">
              Updated {formatCardDate(item.modifiedDate)}
            </span>
          </div>
          <div className="mb-1.5 text-lg font-bold">{item.title}</div>
          {item.description && (
            <p className="mb-3 text-sm text-(--color-neutral-600)">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs font-semibold text-(--color-neutral-600)">
            <span className="inline-flex items-center gap-1">
              <ArrowBigUp className="h-[13px] w-[13px]" />
              {item.voteCount.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-[13px] w-[13px]" />
              {item.viewCount.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-[13px] w-[13px]" />
              {item.forkCount.toLocaleString()}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
