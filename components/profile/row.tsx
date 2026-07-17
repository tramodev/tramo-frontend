import Link from "next/link"

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-5 rounded-2xl transition-colors hover:bg-card -mx-4 py-4 px-4">
      {children}
    </div>
  )
}

export function Thumbnail({ thumbnail, title }: { thumbnail: string | null; title: string }) {
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-md w-24 h-16 bg-surface-container-high">
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="h-full w-full scale-[1.15] object-cover object-top" />
      ) : (
        <span className="font-display text-2xl font-medium text-primary">
          {title.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function EmptyState({ message, linkHref, linkLabel }: { message: string; linkHref: string; linkLabel: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {message}{" "}
      <Link href={linkHref} className="font-medium text-primary">
        {linkLabel}
      </Link>
    </p>
  )
}
