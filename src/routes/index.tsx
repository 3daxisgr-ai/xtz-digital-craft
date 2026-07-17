import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { About } from "@/components/xtz/About";
import { HowItWorks } from "@/components/xtz/HowItWorks";
import { ProjectCTA } from "@/components/xtz/ProjectCTA";

import { Footer } from "@/components/xtz/Footer";
import { Metrics } from "@/components/xtz/Metrics";
import heroLaser from "@/assets/hero-laser.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TOREO — 3D Printing, Fiber Laser Cutting & Sheet Metal Fabrication" },
      { name: "description", content: "Engineering-led 3D printing, fiber laser cutting, sheet metal bending, MIG/TIG welding and prototyping in Thessaloniki, Greece." },
      { name: "keywords", content: "3D printing, fiber laser cutting, sheet metal bending, MIG welding, TIG welding, CAD design, prototyping, Thessaloniki, Greece" },
      { property: "og:title", content: "TOREO — Engineering-Led Manufacturing in Thessaloniki" },
      { property: "og:description", content: "3D printing, fiber laser cutting, sheet metal bending, welding and CAD design by TOREO in Greece." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/" },
      { property: "og:image", content: `https://www.toreo.gr${heroLaser.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TOREO — 3D Printing, Fiber Laser Cutting & Sheet Metal Fabrication" },
      { name: "twitter:description", content: "Engineering-led 3D printing, fiber laser cutting, sheet metal fabrication and prototyping by TOREO." },
      { name: "twitter:image", content: `https://www.toreo.gr${heroLaser.url}` },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: [
            { "@type": "Service", position: 1, name: "3D Printing", description: "Functional parts and short runs in engineering polymers — PLA, ABS, PETG, PC, TPU.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 2, name: "Fiber Laser Cutting", description: "Precision cutting in steel, stainless and aluminium.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 3, name: "Sheet Metal Bending & Welding", description: "Press-brake bending, MIG and TIG welding and assembly of finished metal parts.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 4, name: "CAD Design & Prototyping", description: "CAD design and prototyping support from concept through manufacturable files.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="text-foreground" style={{ backgroundColor: "#0d1220" }}>
      <Navigation />
      <IntroScene />
      {/* Smooth blend from cinematic hero into lighter body */}
      <div
        aria-hidden
        className="relative h-24 w-full -mt-12 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #000 0%, rgba(13,18,32,0.85) 55%, #0d1220 100%)",
        }}
      />
      <Metrics />
      <About />
      <HowItWorks />
      <PortfolioReel />
      <ProjectCTA />
      
      <Footer />
    </main>
  );
}
