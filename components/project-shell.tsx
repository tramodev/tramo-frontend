import Link from "next/link"
import { Wordmark } from "@/components/logo"
import { SidebarInset } from "@/components/ui/sidebar"

export function ProjectShell({
  homeHref,
  titleSlot,
  actions,
  sidebar,
  content,
}: {
  homeHref: string
  titleSlot: React.ReactNode
  actions?: React.ReactNode
  sidebar: React.ReactNode
  content: React.ReactNode
}) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 px-8">
        <Link href={homeHref} title="Back to projects">
          <Wordmark />
        </Link>
        <span className="h-[18px] w-px bg-border" />
        {titleSlot}
        <div className="ml-auto flex items-center gap-3">
          {actions}
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        {sidebar}
        <SidebarInset>
          <div className="flex flex-1 min-h-0 gap-3 pr-3 pb-3">
            {content}
          </div>
        </SidebarInset>
      </div>
    </>
  )
}
