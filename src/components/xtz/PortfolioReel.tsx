import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import p1 from "@/assets/portfolio-1.jpg";
import p2 from "@/assets/portfolio-2.jpg";
import p3 from "@/assets/portfolio-3.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import chapterLaser from "@/assets/chapter-laser.jpg";
import heroOffice from "@/assets/hero-office.jpg";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

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
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>(".pf-slide");
      const total = slides.length;

      gsap.to(track.current, {
        xPercent: -100 * (total - 1),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          pin: true,
          scrub: 0.8,
          end: () => `+=${(total - 1) * window.innerHeight * 1.1}`,
          snap: {
            snapTo: 1 / (total - 1),
            duration: { min: 0.4, max: 0.8 },
            ease: "power3.inOut",
            delay: 0.05,
          },
        },
      });

      // Per-slide cinematic reveal: zoom + parallax + text
      slides.forEach((slide) => {
        const img = slide.querySelector<HTMLElement>(".pf-img");
        const content = slide.querySelectorAll<HTMLElement>(".pf-anim");
        const accent = slide.querySelector<HTMLElement>(".pf-accent");

        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.18 },
            {
              scale: 1,
              duration: 1.2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: slide,
                start: "left center",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        if (content.length) {
          gsap.from(content, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: slide,
              start: "left center",
              toggleActions: "play none none reverse",
            },
          });
        }

        if (accent) {
          gsap.from(accent, {
            scaleX: 0,
            transformOrigin: "left",
            duration: 1,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: slide,
              start: "left center",
              toggleActions: "play none none reverse",
            },
          });
        }
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
        {projects.map((p, i) => (
          <div key={p.index} className="pf-slide relative h-screen w-screen shrink-0 overflow-hidden">
            <img
              src={p.img}
              alt={p.alt}
              loading="lazy"
              width={1920}
              height={1080}
              className="pf-img absolute inset-0 h-full w-full object-cover will-change-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />

            <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-20 max-w-[1600px] mx-auto">
              <div className="pf-anim font-mono text-[11px] tracking-[0.3em] text-primary mb-4">
                {p.category.toUpperCase()} · {p.index} / {String(projects.length).padStart(3, "0")}
              </div>
              <div className="pf-accent h-px w-24 bg-primary blue-glow mb-6" />
              <h3 className="pf-anim font-display font-bold leading-[0.9] text-[clamp(3rem,9vw,9rem)] tracking-tighter mb-8">
                {p.title}
              </h3>
              <div className="pf-anim grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl border-t border-border/40 pt-6">
                <Spec label="Category" value={p.category} />
                <Spec label="Material" value={p.material} />
                <Spec label="Process" value={p.process} />
              </div>
            </div>

            {/* Chapter counter */}
            <div className="absolute bottom-8 right-6 md:right-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/70">
              {String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
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
