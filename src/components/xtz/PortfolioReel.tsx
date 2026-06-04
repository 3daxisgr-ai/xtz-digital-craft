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
  special?: "network";
};

const slides: Slide[] = [
  {
    img: chapterLaser,
    alt: "Fiber laser cutting precision sheet metal",
    index: "001",
    title: "Laser Cutting",
    category: "Fiber Laser",
    description:
      "High-precision fiber laser cutting on steel, stainless and aluminium with micron-level accuracy.",
    tags: ["Precision", "Speed", "Steel · Inox · Alu"],
  },
  {
    img: chapterPrint,
    alt: "Industrial 3D printing for functional parts",
    index: "002",
    title: "3D Printing",
    category: "Additive",
    description:
      "Industrial additive manufacturing for functional parts, end-use components and short runs.",
    tags: ["SLS · FDM · SLA", "Engineering Polymers", "Functional"],
  },
  {
    img: p1,
    alt: "CNC press brake bending sheet metal",
    index: "003",
    title: "Metal Bending",
    category: "Press Brake",
    description:
      "CNC press brake forming for complex geometries — repeatable, tight tolerance bends from 1 to 8 mm.",
    tags: ["CNC Press Brake", "1–8 mm", "Repeatable"],
  },
  {
    img: chapterFab,
    alt: "Arc and TIG welding of fabricated metal structures",
    index: "004",
    title: "Welding",
    category: "Electrical · Arc",
    description:
      "TIG, MIG and arc welding executed by certified operators — structural integrity meets clean aesthetics.",
    tags: ["TIG · MIG · Arc", "Certified", "Structural"],
  },
  {
    img: heroOffice,
    alt: "CNC machining and engineering design workspace",
    index: "005",
    title: "CNC Machining & Design",
    category: "CAD · CAM",
    description:
      "From CAD to chip — multi-axis CNC machining paired with in-house engineering and DFM.",
    tags: ["Multi-axis CNC", "CAD / CAM", "DFM"],
  },
  {
    img: p2,
    alt: "Prototyping and product development workshop",
    index: "006",
    title: "Prototyping & Product Development",
    category: "R&D",
    description:
      "From sketch to validated prototype — fast iteration loops that de-risk production tooling.",
    tags: ["Concept → MVP", "Fast Iteration", "Validation"],
  },
  {
    img: p3,
    alt: "Global manufacturing network and partners",
    index: "007",
    title: "Global Manufacturing Network",
    category: "Network",
    description:
      "A distributed production network for sourcing, scale and delivery — anywhere in the world.",
    tags: ["Sourcing", "Scale", "Delivery"],
    special: "network",
  },
];

export function PortfolioReel() {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Horizontal wheel hijack only while the section fully owns the viewport,
  // releases at first/last slide so the page can scroll naturally.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY;
      if (dy === 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.top > 50 || rect.bottom < window.innerHeight - 50) return;

      const max = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= max - 1;
      if ((dy > 0 && atEnd) || (dy < 0 && atStart)) return;

      e.preventDefault();
      el.scrollLeft += dy;
    };

    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive(i);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section id="portfolio" className="relative w-full bg-[#04060d]">
      {/* Top HUD bar */}
      <div className="absolute top-24 left-6 md:left-12 z-30 flex items-center gap-4 pointer-events-none">
        <span className="font-mono text-xs text-[#00E5FF] tracking-[0.3em]">05 /</span>
        <span className="h-px w-16 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">
          {t("portfolio.kicker")}
        </span>
      </div>
      <div className="absolute top-32 left-6 md:left-12 z-30 max-w-lg hidden md:block pointer-events-none">
        <p className="text-sm text-white/45 leading-relaxed">{t("portfolio.title")}</p>
      </div>
      <span className="absolute top-24 right-6 md:right-12 z-30 font-mono text-[10px] tracking-[0.4em] text-[#00E5FF]/70 pointer-events-none">
        SYS · CAPABILITIES · {String(active + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
      </span>

      <div
        ref={scroller}
        className="h-screen w-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth no-scrollbar md:[scroll-snap-stop:always]"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {slides.map((s, i) => (
          <article
            key={s.index}
            className="relative h-full w-screen shrink-0 snap-center overflow-hidden"
            style={{ scrollSnapAlign: "center" }}
          >
            {/* Background image with parallax-style scale */}
            <img
              src={s.img}
              alt={s.alt}
              loading={i === 0 ? "eager" : "lazy"}
              width={1920}
              height={1080}
              className="absolute inset-0 h-full w-full object-cover scale-[1.04]"
            />

            {/* Dark cinematic gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/70 to-[#04060d]/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#04060d]/85 via-transparent to-[#04060d]/60" />

            {/* HUD grid overlay */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.18] mix-blend-screen pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,229,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,255,0.25) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
                maskImage:
                  "radial-gradient(ellipse at 30% 60%, black 30%, transparent 80%)",
              }}
            />

            {/* Neon scanning line */}
            <div
              aria-hidden
              className="absolute left-0 right-0 h-px bg-[#00E5FF] shadow-[0_0_18px_#00E5FF] pointer-events-none"
              style={{
                top: "50%",
                animation: `cap-scan 6s ease-in-out ${i * 0.4}s infinite`,
              }}
            />

            {/* Corner brackets */}
            <Corner className="top-6 left-6" />
            <Corner className="top-6 right-6 rotate-90" />
            <Corner className="bottom-6 left-6 -rotate-90" />
            <Corner className="bottom-6 right-6 rotate-180" />

            {/* Special: world network overlay on last slide */}
            {s.special === "network" && <NetworkOverlay />}

            {/* Content panel — glassmorphism */}
            <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-24 max-w-[1600px] mx-auto">
              <div className="max-w-3xl rounded-sm border border-[#00E5FF]/25 bg-[#04060d]/45 backdrop-blur-md p-7 md:p-9 shadow-[0_0_60px_-20px_rgba(0,229,255,0.45)]">
                <div className="font-mono text-[11px] tracking-[0.35em] text-[#00E5FF] mb-4">
                  {s.category.toUpperCase()} · {s.index} /{" "}
                  {String(slides.length).padStart(3, "0")}
                </div>
                <div className="h-px w-24 bg-[#00E5FF] shadow-[0_0_12px_#00E5FF] mb-6" />
                <h3 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,7vw,6.5rem)] tracking-tighter mb-6 text-white">
                  {s.title}
                </h3>
                <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-xl mb-6">
                  {s.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border border-[#00E5FF]/40 text-[#00E5FF]/90 bg-[#00E5FF]/[0.04]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 right-6 md:right-12 z-10 font-mono text-[10px] tracking-[0.4em] text-[#00E5FF]/70">
              {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </div>
          </article>
        ))}
      </div>

      {/* Slide indicator / pager */}
      <div className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 z-30 items-center gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to capability ${i + 1}`}
            className={`h-[3px] transition-all duration-500 ${
              active === i
                ? "w-12 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"
                : "w-6 bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes cap-scan {
          0%   { top: 18%; opacity: 0; }
          15%  { opacity: 0.8; }
          50%  { top: 82%; opacity: 0.8; }
          65%  { opacity: 0; }
          100% { top: 82%; opacity: 0; }
        }
        @keyframes cap-node-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.4; }
        }
        @keyframes cap-dash {
          to { stroke-dashoffset: -200; }
        }
      `}</style>
    </section>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-6 h-6 border-t border-l border-[#00E5FF]/70 shadow-[0_0_8px_rgba(0,229,255,0.4)] ${className}`}
    />
  );
}

function NetworkOverlay() {
  // 8 hub points across continents (approx, normalized 0..100)
  const nodes = [
    { x: 18, y: 38, label: "NA" },
    { x: 30, y: 58, label: "LATAM" },
    { x: 47, y: 34, label: "EU" },
    { x: 52, y: 58, label: "AFR" },
    { x: 62, y: 42, label: "ME" },
    { x: 72, y: 38, label: "ASIA" },
    { x: 82, y: 52, label: "SEA" },
    { x: 86, y: 70, label: "AUS" },
  ];
  const links: [number, number][] = [
    [0, 2], [2, 4], [4, 5], [5, 6], [6, 7],
    [2, 3], [0, 1], [1, 3], [5, 7], [2, 5],
  ];

  return (
    <div aria-hidden className="absolute inset-0 z-[5] pointer-events-none">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-90"
      >
        {/* connection lines */}
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="#00E5FF"
            strokeWidth="0.18"
            strokeDasharray="2 3"
            style={{
              animation: `cap-dash ${4 + (i % 5)}s linear infinite`,
              filter: "drop-shadow(0 0 1.2px #00E5FF)",
              opacity: 0.7,
            }}
          />
        ))}
      </svg>

      {/* Nodes */}
      {nodes.map((n, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <span
            className="block w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_14px_#00E5FF]"
            style={{ animation: `cap-node-pulse ${2.4 + (i % 4) * 0.4}s ease-in-out infinite` }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.25em] text-[#00E5FF]/80 whitespace-nowrap">
            {n.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
        {label}
      </div>
      <div className="text-sm md:text-base text-white/85">{value}</div>
    </div>
  );
}
