import Link from "next/link"
import { ArrowBigUp, Eye, GitFork } from "lucide-react"
import type { ProjectFeedItem } from "@/lib/public-project"

function formatCardDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={hrefFor(item.id)}
          className="rounded-2xl bg-card transition-colors hover:bg-muted py-[18px] px-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-primary">
              Published
            </span>
            <span className="text-xs text-muted-foreground">
              Updated {formatCardDate(item.modifiedDate)}
            </span>
          </div>
          <div className="mb-1.5 font-display text-lg font-medium">{item.title}</div>
          {item.description && (
            <p className="mb-3 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowBigUp className="h-[13px] w-[13px]" />
              {item.voteCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-[13px] w-[13px]" />
              {item.viewCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-[13px] w-[13px]" />
              {item.forkCount.toLocaleString('en-US')}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
