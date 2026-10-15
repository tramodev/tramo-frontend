// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import { Wordmark } from "@/components/layout/logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-[1216px] gap-10 px-6 py-12 text-[13px] text-muted-foreground md:grid-cols-2 md:px-[72px]">
        <div className="flex flex-col items-start gap-4">
          <Link href="/" aria-label="Tramo home" className="rounded-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark />
          </Link>
          <nav className="-ml-3 flex items-center gap-1" aria-label="Social media">
            <a href="https://discord.gg/rgYQHDYZRe" target="_blank" rel="noopener noreferrer" aria-label="Discord (opens in a new tab)" className="inline-flex h-11 w-11 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </a>
            <a href="https://x.com/tramodev" target="_blank" rel="noopener noreferrer" aria-label="X @tramodev (opens in a new tab)" className="inline-flex h-11 w-11 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <Twitter aria-hidden="true" className="h-5 w-5" />
            </a>
            <a href="https://github.com/tramodev" target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)" className="inline-flex h-11 w-11 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <Github aria-hidden="true" className="h-5 w-5" />
            </a>
          </nav>
          <p>&copy; {new Date().getFullYear()} Tramo Inc. All rights reserved.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:gap-8">
          {[{ title: "Company", pages: ["About", "Blog", "Contact"] }, { title: "Product", pages: ["Wiki", "Changelog", "Roadmap"] }, { title: "Resources", pages: ["Privacy Policy", "Terms of Service"] }].map(section => (
            <div key={section.title}>
              <h2 className="mb-4 text-sm font-medium text-foreground">{section.title}</h2>
              <ul className="space-y-3">
                {section.pages.map(page => (
                  <li key={page}>
                    {page === "About" || page === "Blog" || page === "Wiki" || page === "Changelog" || page === "Roadmap" ? <Link href={`/${page.toLowerCase()}`} className="inline-block rounded-sm py-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{page}</Link> : page === "Contact" ? <a href="mailto:contact@tramo.dev" className="inline-block rounded-sm py-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{page}</a> : <span role="link" aria-disabled="true" title="Coming soon" className="inline-block py-1">
                      {page}<span className="sr-only"> (coming soon)</span>
                    </span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
