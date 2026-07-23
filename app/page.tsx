import { redirect } from "next/navigation";
import { BrowserMockup } from "@/components/landing/browser-mockup";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/layout/navbar";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { PosterCta } from "@/components/landing/poster-cta";
import { Footer } from "@/components/layout/footer";
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
        <div className="max-w-[1216px] mx-auto px-6 md:px-[72px]">
          <Hero />
          <FadeUp scaleIn className="pt-16 pb-[84px]">
            <BrowserMockup />
          </FadeUp>
          <hr className="border-t border-border" />
          <FeaturesSection />
          <hr className="border-t border-border" />
          <PricingSection />
        </div>
        <FadeUp>
          <PosterCta />
        </FadeUp>
        <Footer />
      </div>
    </LandingMotionConfig>
  );
}
