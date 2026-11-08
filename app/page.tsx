// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrowserMockup } from "@/components/landing/browser-mockup";
import { MockGuard } from "@/components/landing/mock-guard";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/layout/navbar";
import { FeaturesSection } from "@/components/landing/features-section";
import { CollaborationSection } from "@/components/landing/collaboration-section";
import { ExplorePublishSection } from "@/components/landing/explore-publish-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { OpenSourceSection } from "@/components/landing/open-source-section";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FadeUp, LandingMotionConfig } from "@/components/landing/landing-motion";
import { isLoggedIn } from "@/lib/auth";
import heroBg from "@/public/hero-bg.webp";
import ctaBg from "@/public/cta-bg.webp";

export default async function Home() {
  if (await isLoggedIn()) {
    redirect("/projects");
  }

  return (
    <LandingMotionConfig>
      <div id="home" className="min-h-screen">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="container-app px-6 md:px-12">
          <Hero />
          <FadeUp scaleIn className="pt-16 pb-[84px]">
            <div className="relative overflow-hidden rounded-lg bg-muted p-4 sm:p-8 lg:p-14">
              <Image src={heroBg} alt="" fill priority placeholder="blur" sizes="(min-width: 1396px) 1300px, 100vw" className="object-cover" />
              <div className="relative"><MockGuard><BrowserMockup /></MockGuard></div>
            </div>
          </FadeUp>
          <hr className="border-t border-border" />
          <FeaturesSection />
          <hr className="border-t border-border" />
          <CollaborationSection />
          <hr className="border-t border-border" />
          <ExplorePublishSection />
          <hr className="border-t border-border" />
          <OpenSourceSection />
          <PricingSection />
          <FadeUp className="relative isolate mb-[84px] flex min-h-[28rem] items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-12 lg:min-h-[32rem] lg:p-16">
            <Image src={ctaBg} alt="" fill placeholder="blur" sizes="(min-width: 1396px) 1300px, 100vw" className="-z-20 object-cover object-bottom" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-card/60" />
            <div className="flex flex-col items-center text-center">
              <h2 className="landing-display max-w-[16ch] font-display text-5xl font-medium leading-[1.05] sm:text-6xl">Your ideas, one path at a time.</h2>
              <p className="mt-4 text-[1.0625rem] font-medium text-foreground">Free, open source, no card required.</p>
              <Button asChild size="xl" className="mt-8">
                <a href="/signup">Create your first trail<ArrowRight className="size-4" /></a>
              </Button>
            </div>
          </FadeUp>
        </main>
        <Footer />
      </div>
    </LandingMotionConfig>
  );
}
