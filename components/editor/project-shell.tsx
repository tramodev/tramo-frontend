// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from "next/link"
import { Mark } from "@/components/layout/logo"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export function ProjectShell({
  homeHref,
  showLogo = true,
  titleSlot,
  actions,
  sidebar,
  content,
}: {
  homeHref: string
  showLogo?: boolean
  titleSlot: React.ReactNode
  actions?: React.ReactNode
  sidebar: React.ReactNode
  content: React.ReactNode
}) {
  return (
    <>
      {sidebar}
      <SidebarInset className="min-w-0">
        <header className="flex min-h-28 shrink-0 flex-wrap items-center gap-2 px-4 py-2 md:min-h-16 md:flex-nowrap md:gap-4 md:px-8">
          <SidebarTrigger className="md:hidden" />
          {showLogo && (
            <>
              <Link href={homeHref} title="Back to projects">
                <Mark />
              </Link>
              <span className="h-[18px] w-px bg-border shrink-0" />
            </>
          )}
          <div className="min-w-0 flex-1">{titleSlot}</div>
          <div className="ml-auto flex w-full min-w-0 items-center gap-3 overflow-x-auto md:w-auto md:max-w-[70%] [&>*]:shrink-0">
            {actions}
          </div>
        </header>
        <div className="flex flex-1 min-h-0 gap-3 px-3">
          {content}
        </div>
      </SidebarInset>
    </>
  )
}
