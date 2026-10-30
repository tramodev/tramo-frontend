// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import Link from "next/link"
import { LandingSectionLink } from "@/components/layout/landing-section-link"
import { ChevronDown, Menu } from "lucide-react"
import { RESOURCE_LINKS } from "@/components/layout/resources-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"

export function NavMobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pt-2">
          <SheetClose asChild>
            <LandingSectionLink href="/#product" className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Product
            </LandingSectionLink>
          </SheetClose>
          <SheetClose asChild>
            <LandingSectionLink href="/#pricing" className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Plans</LandingSectionLink>
          </SheetClose>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">Resources<ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" /></summary>
            <div className="ml-4 border-l border-border pl-2">
              {RESOURCE_LINKS.map(({ href, label }) => <SheetClose key={href} asChild><Link href={href} className="block rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</Link></SheetClose>)}
            </div>
          </details>
          {!isLoggedIn && (
            <>
              <SheetClose asChild>
                <Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted">
                  Log In
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/signup" className="mt-2">
                  <Button size="lg" className="w-full">Start for free</Button>
                </Link>
              </SheetClose>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
