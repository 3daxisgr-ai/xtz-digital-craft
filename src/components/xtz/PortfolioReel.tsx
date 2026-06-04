import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import p1 from "@/assets/portfolio-1.jpg";
import p2 from "@/assets/portfolio-2.jpg";
import p3 from "@/assets/portfolio-3.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

const projects = [
  {
    img: p2,
    alt: "Custom stainless steel components precision manufactured",
    index: "001",
    title: "Custom Stainless Steel Components",
    category: "Stainless Steel",
    material: "304 / 316 Stainless",
    process: "Laser cut · form · finish",
  },
  {
    img: chapterFab,
    alt: "Architectural metal feature for commercial and architectural projects",
    index: "002",
    title: "Architectural Metal Features",
    category: "Architectural",
    material: "Steel / Aluminium · 2–8mm",
    process: "Laser · form · weld · install",
  },
  {
    img: p1,
    alt: "Industrial sheet metal assembly precision built",
    index: "003",
    title: "Industrial Sheet Metal Assemblies",
    category: "Sheet Metal",
    material: "Mild Steel / Stainless",
    process: "Laser cut · formed · assembled",
  },
  {
    img: chapterPrint,
    alt: "Functional 3D printed parts for prototyping and production",
    index: "004",
    title: "Functional 3D Printed Parts",
    category: "3D Printing",
    material: "Engineering Polymer / Resin",
    process: "SLS / FDM · functional fit",
  },
  {
    img: p3,
    alt: "Acrylic display and custom presentation solution",
    index: "005",
    title: "Acrylic Displays & Custom Solutions",
    category: "Acrylic",
    material: "Cast Acrylic · 3–10mm",
    process: "Precision cut · polish · bond",
  },
  {
    img: p3,
    alt: "Custom fabrication project with integrated manufacturing",
    index: "006",
    title: "Custom Fabrication Projects",
    category: "Integrated",
    material: "Multiple materials",
    process: "Design · laser · form · assembly",
  },
];

export function PortfolioReel() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>(".pf-slide");
      gsap.to(track.current, {
        xPercent: -100 * (slides.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          pin: true,
          scrub: 1,
          end: () => `+=${(slides.length - 1) * window.innerHeight}`,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="portfolio" ref={root} className="relative h-screen w-full overflow-hidden bg-black">
      <div className="absolute top-24 left-6 md:left-12 z-20 flex items-center gap-4">
        <span className="font-mono text-xs text-primary tracking-[0.3em]">05 /</span>
        <span className="h-px w-16 bg-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("portfolio.kicker")}
        </span>
      </div>
      <div className="absolute top-32 left-6 md:left-12 z-20 max-w-lg hidden md:block">
        <p className="text-sm text-foreground/50 leading-relaxed">
          {t("portfolio.title")}
        </p>
      </div>
      <span className="absolute top-24 right-6 md:right-12 z-20 font-mono text-[10px] tracking-[0.4em] text-primary/60">X · Y · Z</span>

      <div ref={track} className="flex h-full will-change-transform" style={{ width: `${projects.length * 100}vw` }}>
        {projects.map((p) => (
          <div key={p.index} className="pf-slide relative h-screen w-screen shrink-0">
            <img
              src={p.img}
              alt={p.alt}
              loading="lazy"
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

            <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-20 max-w-[1600px] mx-auto">
              <div className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4">
                {p.category.toUpperCase()} · {p.index}
              </div>
              <h3 className="font-display font-bold leading-[0.9] text-[clamp(3rem,9vw,9rem)] tracking-tighter mb-8">
                {p.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl border-t border-border/40 pt-6">
                <Spec label="Category" value={p.category} />
                <Spec label="Material" value={p.material} />
                <Spec label="Process" value={p.process} />
              </div>
            </div>
          </div>
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
