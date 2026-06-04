import p1 from "@/assets/portfolio-1.jpg";
import p2 from "@/assets/portfolio-2.jpg";
import p3 from "@/assets/portfolio-3.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import chapterLaser from "@/assets/chapter-laser.jpg";
import heroOffice from "@/assets/hero-office.jpg";
import { useEffect, useRef } from "react";
import { useI18n } from "./i18n";

const projects = [
  {
    img: heroOffice,
    alt: "Design and development workspace for engineering projects",
    index: "001",
    title: "Design & Development",
    category: "Design",
    material: "Concept · CAD · Engineering",
    process: "Ideation · modeling · iteration",
  },
  {
    img: chapterLaser,
    alt: "Fiber laser cutting precision sheet metal",
    index: "002",
    title: "Fiber Laser Cutting",
    category: "Laser",
    material: "Steel · Stainless · Aluminium",
    process: "High-precision fiber laser",
  },
  {
    img: p1,
    alt: "Sheet metal forming and bending precision components",
    index: "003",
    title: "Sheet Metal Forming",
    category: "Forming",
    material: "Mild Steel / Stainless · 1–8mm",
    process: "CNC press brake · bending",
  },
  {
    img: chapterFab,
    alt: "Welding and assembly of fabricated metal structures",
    index: "004",
    title: "Welding & Assembly",
    category: "Fabrication",
    material: "Steel / Stainless / Aluminium",
    process: "TIG · MIG · final assembly",
  },
  {
    img: chapterPrint,
    alt: "Industrial 3D printing for functional parts and prototypes",
    index: "005",
    title: "3D Printing",
    category: "Additive",
    material: "Engineering Polymer / Resin",
    process: "SLS · FDM · SLA",
  },
  {
    img: p2,
    alt: "Custom manufacturing solutions for unique components",
    index: "006",
    title: "Custom Manufacturing",
    category: "Custom",
    material: "Multiple materials",
    process: "End-to-end production",
  },
  {
    img: p3,
    alt: "Global manufacturing network and trusted production partners",
    index: "007",
    title: "Global Manufacturing Network",
    category: "Network",
    material: "Distributed production",
    process: "Sourcing · scale · delivery",
  },
];

export function PortfolioReel() {
  const { t } = useI18n();

  return (
    <section id="portfolio" className="relative w-full bg-black">
      <div className="absolute top-24 left-6 md:left-12 z-30 flex items-center gap-4 pointer-events-none">
        <span className="font-mono text-xs text-primary tracking-[0.3em]">05 /</span>
        <span className="h-px w-16 bg-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("portfolio.kicker")}
        </span>
      </div>
      <div className="absolute top-32 left-6 md:left-12 z-30 max-w-lg hidden md:block pointer-events-none">
        <p className="text-sm text-foreground/50 leading-relaxed">{t("portfolio.title")}</p>
      </div>
      <span className="absolute top-24 right-6 md:right-12 z-30 font-mono text-[10px] tracking-[0.4em] text-primary/60 pointer-events-none">
        X · Y · Z
      </span>

      <div
        className="h-screen w-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {projects.map((p, i) => (
          <article
            key={p.index}
            className="relative h-full w-screen shrink-0 snap-center overflow-hidden"
            style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <img
              src={p.img}
              alt={p.alt}
              loading="lazy"
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />

            <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-20 max-w-[1600px] mx-auto">
              <div className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4">
                {p.category.toUpperCase()} · {p.index} / {String(projects.length).padStart(3, "0")}
              </div>
              <div className="h-px w-24 bg-primary blue-glow mb-6" />
              <h3 className="font-display font-bold leading-[0.9] text-[clamp(3rem,9vw,9rem)] tracking-tighter mb-8">
                {p.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl border-t border-border/40 pt-6">
                <Spec label="Category" value={p.category} />
                <Spec label="Material" value={p.material} />
                <Spec label="Process" value={p.process} />
              </div>
            </div>

            <div className="absolute bottom-8 right-6 md:right-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/70">
              {String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
        {label}
      </div>
      <div className="text-sm md:text-base text-foreground/90">{value}</div>
    </div>
  );
}
