import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Navigation } from "@/components/xtz/Navigation";
import { PortfolioIntro } from "@/components/portfolio/PortfolioIntro";
import { PortfolioDeck } from "@/components/portfolio/PortfolioDeck";
import { ProjectViewerHost } from "@/components/portfolio/ProjectViewer";
import { PROJECTS, type Project } from "@/components/portfolio/projects";


export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Engineering Portfolio — TOREO 3D Printing & Metal Fabrication" },
      { name: "description", content: "Explore TOREO engineering projects as interactive 3D CAD models: weldments, enclosures, gearboxes and replacement parts with full material, tolerance and process data." },
      { property: "og:title", content: "Engineering Portfolio — Interactive 3D CAD Projects | TOREO" },
      { property: "og:description", content: "Interactive 3D portfolio of laser-cut, bent, welded and 3D-printed parts produced by TOREO in Thessaloniki." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Engineering Portfolio — Interactive 3D CAD Projects | TOREO" },
      { name: "twitter:description", content: "Explore TOREO manufacturing projects as interactive 3D models with full engineering data." },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/portfolio" }],
  }),
  component: PortfolioPage,
});

const DECK = [...PROJECTS].sort((a, b) => Number(b.featured) - Number(a.featured) || b.year - a.year);

function PortfolioPage() {
  const [introDone, setIntroDone] = useState(false);
  const [active, setActive] = useState<Project | null>(null);

  const step = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => {
        if (!cur) return cur;
        const i = DECK.findIndex((p) => p.slug === cur.slug);
        return DECK[(i + dir + DECK.length) % DECK.length];
      });
    },
    [],
  );

  return (
    <div className="relative h-[100svh] overflow-hidden" style={{ backgroundColor: "#0B0F14" }}>
      {!introDone && <PortfolioIntro onDone={() => setIntroDone(true)} />}

      <div className="absolute inset-x-0 top-0 z-40">
        <Navigation />
      </div>

      <h1 className="sr-only">TOREO engineering portfolio — interactive 3D projects</h1>

      <PortfolioDeck projects={DECK} onOpenDetails={setActive} />

      <ProjectViewerHost
        project={active}
        onClose={() => setActive(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </div>
  );
}
