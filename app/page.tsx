import { redirect } from "next/navigation";
import { archivo } from "@/lib/fonts";
import "./landing.css";
import { BrowserMockup } from "@/components/browser-mockup";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { FeaturesSection } from "@/components/features-section";
import { PosterCta } from "@/components/poster-cta";
import { Footer } from "@/components/footer";
import { isLoggedIn } from "@/lib/auth";

export default async function Home() {
  if (await isLoggedIn()) {
    redirect("/projects");
  }

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

      <Footer />
    </div>
  );
}
