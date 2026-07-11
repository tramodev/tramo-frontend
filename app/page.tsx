import { archivo } from "@/lib/fonts";
import "./landing.css";
import { BrowserMockup } from "@/components/browser-mockup";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { FeaturesSection } from "@/components/features-section";
import { PosterCta } from "@/components/poster-cta";

export default function Home() {
  return (
    <div className={`modernist min-h-screen ${archivo.className}`}>
      <Navbar />

      <div className="max-w-[1216px] mx-auto px-[72px]">
        <Hero />

        <div className="pt-16 pb-[84px]">
          <BrowserMockup />
        </div>

        <hr className="hr" />

        <FeaturesSection />
      </div>

      <PosterCta />

      <footer>
        <div
          className="max-w-[1216px] mx-auto px-[72px] py-10 text-[13px] flex justify-between gap-4"
          style={{ color: 'var(--color-neutral-700)' }}
        >
          <span>&copy; {new Date().getFullYear()} MyPath Inc. All rights reserved.</span>
          <span className="tabular-nums">mypath.app</span>
        </div>
      </footer>
    </div>
  );
}
