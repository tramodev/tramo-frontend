// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { redirect } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";
import { BrowserMockup } from "@/components/landing/browser-mockup";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/layout/navbar";
import { FeaturesSection } from "@/components/landing/features-section";
import { ExplorePublishSection } from "@/components/landing/explore-publish-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FadeUp, LandingMotionConfig } from "@/components/landing/landing-motion";
import { isLoggedIn } from "@/lib/auth";

export default async function Home() {
  if (await isLoggedIn()) {
    redirect("/projects");
  }

  return (
    <LandingMotionConfig>
      <div className="min-h-screen">
        <Navbar />
        <div className="container-app px-6 md:px-12">
          <Hero />
          <FadeUp scaleIn className="pt-16 pb-[84px]">
            <BrowserMockup />
          </FadeUp>
          <hr className="border-t border-border" />
          <FeaturesSection />
          <hr className="border-t border-border" />
          <ExplorePublishSection />
          <hr className="border-t border-border" />
          <PricingSection />
          <FadeUp className="mb-[84px] grid items-center gap-12 overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20 lg:p-16">
            <div>
              <p className="mb-5 text-xs font-medium uppercase tracking-widest text-primary">Every trail starts somewhere</p>
              <h2 className="max-w-[12ch] font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">Start your first trail.</h2>
              <p className="mt-6 max-w-[36ch] text-base leading-relaxed text-muted-foreground">A question, a connection, a new way to see things. Start with one note and follow where it takes you.</p>
              <Button asChild size="xl" className="mt-8">
                <a href="/signup">Start for free<ArrowRight className="size-4" /></a>
              </Button>
            </div>
            <div aria-hidden="true" className="px-2 sm:px-4">
              <p className="mb-5 text-xs font-medium text-muted-foreground">A trail to a better cup of coffee</p>
              <ol className="space-y-4 rounded-md border border-border bg-muted/20 p-4 sm:p-6">
                <li className="rounded-lg border border-border bg-card p-5 shadow-elevation-1">
                  <span className="mb-3 block text-xs text-muted-foreground">01 · A question</span>
                  <p className="font-display text-xl font-medium">Why does my coffee taste bitter?</p>
                </li>
                <li className="rounded-lg border border-primary/30 bg-primary/5 p-5 shadow-elevation-1">
                  <span className="mb-3 flex items-center justify-between gap-2 text-xs text-primary">02 · A shared idea<Link2 className="size-3.5" /></span>
                  <p className="font-display text-xl font-medium">Grind size &amp; extraction</p>
                </li>
                <li className="rounded-lg border border-border bg-card p-5 shadow-elevation-1">
                  <span className="mb-3 block text-xs text-muted-foreground">03 · Your next direction</span>
                  <p className="font-display text-xl font-medium">My new morning recipe</p>
                </li>
              </ol>
            </div>
          </FadeUp>
        </div>
        <Footer />
      </div>
    </LandingMotionConfig>
  );
}
