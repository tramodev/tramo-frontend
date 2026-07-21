"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
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
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pt-2">
          <SheetClose asChild>
            <a href="#product" className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Product
            </a>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/explore" className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Explore
            </Link>
          </SheetClose>
          {!isLoggedIn && (
            <>
              <SheetClose asChild>
                <Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted">
                  Sign in
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/signup" className="mt-2">
                  <Button size="lg" className="w-full">Get started</Button>
                </Link>
              </SheetClose>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
