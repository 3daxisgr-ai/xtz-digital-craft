import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { About } from "@/components/xtz/About";
import { HowItWorks } from "@/components/xtz/HowItWorks";
import { Footer } from "@/components/xtz/Footer";
import heroOffice from "@/assets/hero-office.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3D AXIS — From Concept to Reality" },
      { name: "description", content: "3D AXIS: design, prototype and manufacture under one roof. Fiber laser cutting, sheet metal, 3D printing and engineering." },
      { property: "og:title", content: "3D AXIS — From Concept to Reality" },
      { property: "og:description", content: "Design, prototype and manufacture under one roof." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "preload", as: "image", href: heroOffice, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="bg-black text-foreground">
      <Navigation />
      <IntroScene />
      <PortfolioReel />
      <About />
      <HowItWorks />
      <Footer />
    </main>
  );
}
