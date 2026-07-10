import { BrowserMockup } from "@/components/browser-mockup";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden relative">
      <Navbar />
      <main className="relative z-10 flex flex-col items-center justify-start pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Hero />
        <div className="relative w-full mt-16 max-w-6xl">
          <BrowserMockup />
        </div>
      </main>
      <footer className="relative z-10 w-full py-12 border-t border-border text-center text-muted-foreground text-sm bg-foreground/5 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} MyPath Inc. All rights reserved.</p>
        <p className="mt-2">Mockup created with React & Tailwind.</p>
      </footer>
    </div>
  );
}
