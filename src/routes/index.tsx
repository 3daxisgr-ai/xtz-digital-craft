import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { About } from "@/components/xtz/About";
import { HowItWorks } from "@/components/xtz/HowItWorks";
import { ProjectCTA } from "@/components/xtz/ProjectCTA";
import { Footer } from "@/components/xtz/Footer";
import { Metrics } from "@/components/xtz/Metrics";
import { useI18n } from "@/components/xtz/i18n";
import heroLaser from "@/assets/hero-laser.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SKG3D — From Concept to Reality" },
      { name: "description", content: "Design, prototype and manufacture under one roof. Fiber laser cutting, sheet metal, 3D printing and engineering by SKG3D." },
      { property: "og:title", content: "SKG3D — From Concept to Reality" },
      { property: "og:description", content: "Design, prototype and manufacture under one roof." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/" },
      { property: "og:image", content: `https://xtz-digital-craft.lovable.app${heroLaser.url}` },
      { name: "twitter:image", content: `https://xtz-digital-craft.lovable.app${heroLaser.url}` },
    ],
    links: [
      { rel: "canonical", href: "https://xtz-digital-craft.lovable.app/" },
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
            { "@type": "Service", position: 1, name: "Fiber Laser Cutting", description: "Micron-level precision cutting on steel, stainless and aluminium.", provider: { "@type": "Organization", name: "SKG3D" } },
            { "@type": "Service", position: 2, name: "Sheet Metal Forming & Welding", description: "Bending, welding and assembly of finished metal parts.", provider: { "@type": "Organization", name: "SKG3D" } },
            { "@type": "Service", position: 3, name: "3D Printing", description: "Functional parts and short runs in engineering polymers.", provider: { "@type": "Organization", name: "SKG3D" } },
            { "@type": "Service", position: 4, name: "Design & Prototyping", description: "Idea to working prototype in days, not months.", provider: { "@type": "Organization", name: "SKG3D" } },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();

  const scrollToHero = () => {
    const el = document.getElementById("intro");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

      {/* START YOUR PROJECT — moved from bottom CTA */}
      <section
        className="relative z-10 w-full flex items-center justify-center py-14 md:py-18"
        style={{ backgroundColor: "#0d1220" }}
      >
        <button
          type="button"
          onClick={scrollToHero}
          className="group relative inline-flex items-center gap-3 bg-primary px-10 py-5 font-mono text-xs tracking-[0.3em] text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_60px_-10px_oklch(0.72_0.18_245_/_0.5)]"
        >
          <span>{t("cta.button")}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
      </section>

      <About />
      <HowItWorks />
      <PortfolioReel />
      <ProjectCTA />
      <Footer />
    </main>
  );
}
