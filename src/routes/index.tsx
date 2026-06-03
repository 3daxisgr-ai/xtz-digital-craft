import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { Chapter } from "@/components/xtz/Chapter";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { Process } from "@/components/xtz/Process";
import { QuotePanel } from "@/components/xtz/QuotePanel";
import { Finale } from "@/components/xtz/Finale";
import chapterLaser from "@/assets/chapter-laser.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XTZ — Precision Beyond Limits" },
      { name: "description", content: "XTZ. Precision laser cutting, engraving, premium printing, signage, custom fabrication and industrial design. A cinematic studio for serious makers." },
      { property: "og:title", content: "XTZ — Precision Beyond Limits" },
      { property: "og:description", content: "Precision laser cutting, signage and custom fabrication. Step into the XTZ digital universe." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="bg-black text-foreground">
      <Navigation />
      <IntroScene />
      <Chapter
        id="laser"
        number="01 /"
        kicker="Laser Cutting"
        title="Light that cuts steel."
        description="Fiber laser precision to ±0.05mm across stainless, aluminium, brass and titanium. Production-grade tolerances on one-off prototypes and runs of ten thousand."
        image={chapterLaser}
        imageAlt="Industrial fiber laser cutting through steel sheet with blue sparks"
      />
      <Chapter
        id="print"
        number="02 /"
        kicker="Premium Printing"
        title="Ink with weight."
        description="Foil stamping, deep emboss, soft-touch laminates. Editorial print and brand collateral where every page has presence."
        image={chapterPrint}
        imageAlt="Macro shot of metallic foil stamping on dark embossed paper"
        align="right"
      />
      <Chapter
        id="fab"
        number="03 /"
        kicker="Custom Fabrication"
        title="Built once. Built right."
        description="From CNC components to architectural metalwork — engineered with industrial designers, machinists and finishers under one roof."
        image={chapterFab}
        imageAlt="CNC-machined brushed aluminium component on dark workshop bench"
      />
      <PortfolioReel />
      <Process />
      <QuotePanel />
      <Finale />
    </main>
  );
}
