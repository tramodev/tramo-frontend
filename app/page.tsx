// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { TrailHero } from "@/components/landing/trail/trail-hero";
import { FreeAndOpenTrail, TrailJourney } from "@/components/landing/trail/trail-journey";
import { TrailEnd } from "@/components/landing/trail/trail-end";
import { PricingSection } from "@/components/landing/pricing-section";
import { OpenSourceSection } from "@/components/landing/open-source-section";
import { Footer } from "@/components/layout/footer";
import { LandingMotionConfig } from "@/components/landing/landing-motion";
import { isLoggedIn } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: "Tramo — Turn notes into trails for learning and explaining" },
  description: "Turn connected, reusable notes into trails for learning and explaining. Write a note once, reuse it in as many trails as you need, and share a clear explanation.",
  alternates: { canonical: "/" },
};

const STRUCTURED_DATA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Tramo", alternateName: ["tramo.dev", "Tramo.dev"], url: `${SITE_URL}/`, publisher: { "@id": `${SITE_URL}/#organization` } },
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Tramo", alternateName: "tramo.dev", url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.svg`, email: "contact@tramo.dev", sameAs: ["https://github.com/tramodev", "https://x.com/tramodev", "https://discord.gg/rgYQHDYZRe"] },
  ],
}).replace(/</g, "\\u003c");

export default async function Home() {
  if (await isLoggedIn()) {
    redirect("/projects");
  }

  return (
    <LandingMotionConfig>
      <div id="home" className="min-h-screen selection:bg-foreground selection:text-background">
        <script type="application/ld+json">{STRUCTURED_DATA}</script>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-background">
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="container-app px-6 outline-none md:px-12">
          <TrailHero />
          <TrailJourney />
          <FreeAndOpenTrail steps={[<OpenSourceSection key="open" />, <PricingSection key="pricing" />]} />
          <TrailEnd />
        </main>
        <Footer />
      </div>
    </LandingMotionConfig>
  );
}
