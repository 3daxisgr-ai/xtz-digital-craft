import p1 from "@/assets/portfolio-1.jpg";
import p2 from "@/assets/portfolio-2.jpg";
import p3 from "@/assets/portfolio-3.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import chapterLaser from "@/assets/chapter-laser.jpg";
import heroOffice from "@/assets/hero-office.jpg";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";

type Slide = {
  img: string;
  alt: string;
  index: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
};

const slides: Slide[] = [
  {
    img: chapterLaser,
    alt: "Fiber laser cutting precision sheet metal",
    index: "001",
    title: "Laser Cutting",
    category: "Fiber Laser",
    description: "Micron-level precision on steel, stainless and aluminium.",
    tags: ["Precision", "Speed"],
  },
  {
    img: chapterPrint,
    alt: "Industrial 3D printing for functional parts",
    index: "002",
    title: "3D Printing",
    category: "Additive",
    description: "Functional parts and short runs with engineering polymers.",
    tags: ["SLS · FDM · SLA", "End-use"],
  },
  {
    img: p1,
    alt: "CNC press brake bending sheet metal",
    index: "003",
    title: "Metal Bending",
    category: "Press Brake",
    description: "CNC press brake forming for complex repeatable geometries.",
    tags: ["1–8 mm", "CNC"],
  },
  {
    img: chapterFab,
    alt: "Arc and TIG welding of fabricated metal structures",
    index: "004",
    title: "Welding",
    category: "Arc · TIG · MIG",
    description: "Certified operators — structural integrity, clean aesthetics.",
    tags: ["Certified", "Structural"],
  },
  {
    img: heroOffice,
    alt: "CNC machining and engineering design workspace",
    index: "005",
    title: "CNC Machining & Design",
    category: "CAD · CAM",
    description: "Multi-axis CNC paired with in-house engineering and DFM.",
    tags: ["Multi-axis", "DFM"],
  },
  {
    img: p2,
    alt: "Prototyping and product development workshop",
    index: "006",
    title: "Prototyping",
    category: "R&D",
    description: "Sketch to validated prototype — fast iteration loops.",
    tags: ["MVP", "Iteration"],
  },
  {
    img: p3,
    alt: "Global manufacturing network and partners",
    index: "007",
    title: "Global Network",
    category: "Manufacturing",
    description: "Distributed sourcing, scale and worldwide delivery.",
    tags: ["Sourcing", "Scale"],
  },
];

export function PortfolioReel() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Snap to a specific card
  const goTo = (i: number) => {
    const track = trackRef.current;
    const card = cardRefs.current[i];
    if (!track || !card) return;
    const target =
      card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
  };

  // Wheel hijack — only when section dominates viewport, snap card-by-card
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let cooldown = false;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY;
      if (dy === 0) return;

      const rect = section.getBoundingClientRect();
      // engage only when the section roughly fills the viewport
      if (rect.top > 60 || rect.bottom < window.innerHeight - 60) return;

      // release at edges so the page continues to scroll naturally
      const atStart = active <= 0;
      const atEnd = active >= slides.length - 1;
      if ((dy > 0 && atEnd) || (dy < 0 && atStart)) return;

      e.preventDefault();
      if (cooldown) return;
      cooldown = true;
      const next = Math.min(
        slides.length - 1,
        Math.max(0, active + (dy > 0 ? 1 : -1)),
      );
      goTo(next);
      setActive(next);
      window.setTimeout(() => (cooldown = false), 480);
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    return () => section.removeEventListener("wheel", onWheel);
  }, [active]);

  // Update active index from manual horizontal scroll/touch
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let bestI = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((c, i) => {
        if (!c) return;
        const cCenter = c.offsetLeft + c.clientWidth / 2;
        const d = Math.abs(cCenter - center);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
        }
      });
      setActive(bestI);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      className="relative w-full bg-[#04060d] min-h-screen flex items-center overflow-hidden py-24"
    >
      {/* Background grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #00E5FF 1px, transparent 1px), linear-gradient(to bottom, #00E5FF 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)",
        }}
      />
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute -left-40 top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00E5FF, transparent 70%)" }}
      />

      <div className="relative z-10 w-full grid grid-cols-12 gap-6 lg:gap-10 items-center max-w-[1800px] mx-auto px-6 md:px-12">
        {/* LEFT — Title */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00E5FF]">
              SECTION
            </span>
            <span className="h-px w-10 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
          </div>
          <h2 className="font-display font-bold leading-[0.85] tracking-tighter text-white text-[clamp(2.4rem,5vw,4.5rem)] mb-6">
            05 /<br />
            <span className="text-[#00E5FF] drop-shadow-[0_0_24px_rgba(0,229,255,0.45)] text-5xl">
              CAPABILITIES
            </span>
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-8">
            {t("portfolio.title")}
          </p>

          {/* Progress bar */}
          <div className="max-w-[260px]">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-[#00E5FF]/80 mb-2">
              <span>{String(active + 1).padStart(2, "0")}</span>
              <span className="text-white/40">
                / {String(slides.length).padStart(2, "0")}
              </span>
            </div>
            <div className="relative h-[3px] w-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] transition-all duration-500 ease-out"
                style={{
                  width: `${((active + 1) / slides.length) * 100}%`,
                }}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <NavButton onClick={() => goTo(Math.max(0, active - 1))} dir="left" disabled={active === 0} />
              <NavButton onClick={() => goTo(Math.min(slides.length - 1, active + 1))} dir="right" disabled={active === slides.length - 1} />
            </div>
            <div className="mt-6 font-mono text-[9px] tracking-[0.4em] text-white/30">
              ​
            </div>
          </div>
        </div>

        {/* RIGHT — Carousel */}
        <div className="col-span-12 lg:col-span-9 xl:col-span-9 relative">
          <div
            ref={trackRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-6"
            style={{
              scrollSnapType: "x mandatory",
              paddingLeft: "10%",
              paddingRight: "10%",
            }}
          >
            {slides.map((s, i) => {
              const isActive = i === active;
              return (
                <article
                  key={s.index}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  onClick={() => goTo(i)}
                  className={`relative shrink-0 snap-center cursor-pointer transition-all duration-500 ease-out
                    w-[78vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] xl:w-[24vw]
                    aspect-[3/4]
                    ${isActive ? "scale-100 opacity-100" : "scale-[0.9] opacity-50 hover:opacity-75"}
                  `}
                  style={{ scrollSnapAlign: "center" }}
                >
                  {/* Glow frame */}
                  <div
                    className={`absolute -inset-px transition-all duration-500 ${
                      isActive
                        ? "shadow-[0_0_60px_-5px_#00E5FF,0_0_0_1px_#00E5FF]"
                        : "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                    }`}
                  />
                  <div className="relative h-full w-full overflow-hidden bg-black">
                    <img
                      src={s.img}
                      alt={s.alt}
                      loading={i < 2 ? "eager" : "lazy"}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        isActive ? "scale-105" : "scale-100 grayscale"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/40 to-transparent" />

                    {/* Active scan line */}
                    {isActive && (
                      <div
                        aria-hidden
                        className="absolute left-0 right-0 h-px bg-[#00E5FF] shadow-[0_0_18px_#00E5FF]"
                        style={{ animation: "cap-scan 4s ease-in-out infinite" }}
                      />
                    )}

                    {/* Corner brackets */}
                    <Corner className={`top-3 left-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`top-3 right-3 rotate-90 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`bottom-3 left-3 -rotate-90 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`bottom-3 right-3 rotate-180 ${isActive ? "opacity-100" : "opacity-40"}`} />

                    {/* Index badge */}
                    <div className="absolute top-5 left-5 font-mono text-[10px] tracking-[0.3em] text-[#00E5FF]">
                      {s.index}
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="font-mono text-[10px] tracking-[0.35em] text-[#00E5FF]/90 mb-3">
                        {s.category.toUpperCase()}
                      </div>
                      <h3 className="font-display font-bold leading-[0.95] tracking-tight text-white text-2xl md:text-3xl mb-3">
                        {s.title}
                      </h3>
                      <p
                        className={`text-xs md:text-sm text-white/65 leading-relaxed mb-4 transition-all duration-500 ${
                          isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                        }`}
                      >
                        {s.description}
                      </p>
                      <div
                        className={`flex flex-wrap gap-1.5 transition-all duration-500 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {s.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1 border border-[#00E5FF]/40 text-[#00E5FF]/90 bg-[#00E5FF]/[0.05]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#04060d] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#04060d] to-transparent" />
        </div>
      </div>

      <style>{`
        @keyframes cap-scan {
          0%   { top: 10%; opacity: 0; }
          15%  { opacity: 0.8; }
          50%  { top: 90%; opacity: 0.8; }
          65%  { opacity: 0; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-4 h-4 border-t border-l border-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.5)] transition-opacity duration-500 ${className}`}
    />
  );
}

function NavButton({
  onClick,
  dir,
  disabled,
}: {
  onClick: () => void;
  dir: "left" | "right";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous" : "Next"}
      className={`group relative w-12 h-12 border border-[#00E5FF]/40 bg-[#00E5FF]/[0.04] transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "hover:border-[#00E5FF] hover:bg-[#00E5FF]/[0.12] hover:shadow-[0_0_20px_-4px_#00E5FF]"}
      `}
    >
      <span className="absolute inset-0 flex items-center justify-center text-[#00E5FF] font-mono text-lg">
        {dir === "left" ? "←" : "→"}
      </span>
    </button>
  );
}
