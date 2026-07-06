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
      { title: "TOREO — Prototyping, 3D Printing & CNC Manufacturing" },
      { name: "description", content: "Engineering-led rapid prototyping, 3D printing, CNC machining and fiber laser cutting under one roof in Thessaloniki, Greece." },
      { name: "keywords", content: "rapid prototyping, 3D printing services, CNC machining, CNC manufacturing, product development, prototype manufacturing, engineering services, custom parts manufacturing, Greece, Thessaloniki" },
      { property: "og:title", content: "TOREO — Engineering-Led Manufacturing in Thessaloniki" },
      { property: "og:description", content: "Prototyping, 3D printing, CNC machining and product development by TOREO in Greece." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/" },
      { property: "og:image", content: `https://www.toreo.gr${heroLaser.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TOREO — Rapid Prototyping, 3D Printing & CNC Manufacturing" },
      { name: "twitter:description", content: "Engineering-led rapid prototyping, 3D printing services, CNC machining and product development by TOREO." },
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
            { "@type": "Service", position: 1, name: "Rapid Prototyping & Product Development", description: "From sketch to working prototype in days — engineering services and DFM by TOREO.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 2, name: "3D Printing Services", description: "Functional parts and short runs in engineering polymers — PLA, ABS, PETG, PC, TPU.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 3, name: "CNC Manufacturing & Fiber Laser Cutting", description: "Micron-level precision cutting and CNC manufacturing on steel, stainless and aluminium.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
            { "@type": "Service", position: 4, name: "Sheet Metal Forming & Welding", description: "Bending, welding and assembly of finished custom metal parts.", provider: { "@type": "Organization", name: "TOREO" }, areaServed: ["GR", "EU"] },
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
