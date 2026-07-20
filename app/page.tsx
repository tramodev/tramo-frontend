import { redirect } from "next/navigation";
import { BrowserMockup } from "@/components/browser-mockup";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { FeaturesSection } from "@/components/features-section";
import { PricingSection } from "@/components/pricing-section";
import { PosterCta } from "@/components/poster-cta";
import { Footer } from "@/components/footer";
import { FadeUp, LandingMotionConfig } from "@/components/landing-motion";
import { isLoggedIn } from "@/lib/auth";

export default async function Home() {
  if (await isLoggedIn()) {
    redirect("/projects");
  }

  return (
    <LandingMotionConfig>
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-[1216px] mx-auto px-[72px]">
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
