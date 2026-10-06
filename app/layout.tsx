// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import "./editor/Editor.css";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { robotoFlex, roboto, robotoMono } from "@/lib/fonts";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Tramo", template: "%s | Tramo" },
  description:
    "Collect ideas, connect them into trails, and retrace your thinking — build knowledge maps and share them on Tramo.",
  alternates: { canonical: "/" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${robotoFlex.variable} ${roboto.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}