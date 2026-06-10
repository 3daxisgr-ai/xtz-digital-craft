import p1 from "@/assets/portfolio-1.jpg";
import p3 from "@/assets/portfolio-3.jpg";
import chapterPrintAsset from "@/assets/bambu-3d-printing.png.asset.json";
import chapterFabAsset from "@/assets/welding-sparks.jpg.asset.json";
import chapterLaser from "@/assets/chapter-laser.jpg";
const chapterFab = chapterFabAsset.url;
const chapterPrint = chapterPrintAsset.url;
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "./i18n";
import type { CapabilitySlug } from "./Capabilities";

type Slide = {
  img: string;
  alt: string;
  index: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  slug: CapabilitySlug;
};

const slidesEN: Slide[] = [
  { img: chapterLaser, alt: "Fiber laser cutting precision sheet metal", index: "001", title: "Fiber Laser Cutting", category: "Fiber Laser", description: "Micron-level precision on steel, stainless and aluminium.", tags: ["±0.05 mm", "Speed"], slug: "fiber-laser-cutting" },
  { img: chapterFab, alt: "Sheet metal forming and welding fabrication", index: "002", title: "Sheet Metal Forming & Welding", category: "Press Brake · TIG · MIG", description: "Bending, welding and assembly of finished metal parts.", tags: ["CNC Brake", "Certified"], slug: "sheet-metal-forming-welding" },
  { img: chapterPrint, alt: "Industrial 3D printing for functional parts", index: "003", title: "3D Printing", category: "Additive", description: "Functional parts and short runs in engineering polymers.", tags: ["FDM · SLA", "End-use"], slug: "3d-printing" },
  { img: p1, alt: "Prototyping and product development workshop", index: "004", title: "Design → Prototype", category: "R&D", description: "Idea to working prototype in days, not months.", tags: ["MVP", "Iteration"], slug: "design-to-prototype" },
  { img: p3, alt: "Global manufacturing network and partners", index: "005", title: "Mass Production", category: "Manufacturing", description: "Distributed sourcing, scale and worldwide delivery.", tags: ["Sourcing", "Scale"], slug: "global-manufacturing-network" },
];

const slidesGR: Slide[] = [
  { img: chapterLaser, alt: "Κοπή fiber laser ακριβείας σε λαμαρίνα", index: "001", title: "Κοπή Fiber Laser", category: "Fiber Laser", description: "Ακρίβεια επιπέδου micron σε χάλυβα, ανοξείδωτο και αλουμίνιο.", tags: ["±0.05 mm", "Ταχύτητα"], slug: "fiber-laser-cutting" },
  { img: chapterFab, alt: "Στραντζάρισμα και συγκολλήσεις λαμαρίνας", index: "002", title: "Στραντζάρισμα & Συγκολλήσεις", category: "Στράντζα · TIG · MIG", description: "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων.", tags: ["CNC Στράντζα", "Πιστοποιημένα"], slug: "sheet-metal-forming-welding" },
  { img: chapterPrint, alt: "Βιομηχανική 3D εκτύπωση για λειτουργικά εξαρτήματα", index: "003", title: "3D Εκτύπωση", category: "Προσθετική", description: "Λειτουργικά εξαρτήματα και μικρές σειρές σε μηχανικά πολυμερή.", tags: ["FDM · SLA", "Τελικής χρήσης"], slug: "3d-printing" },
  { img: p1, alt: "Εργαστήριο πρωτοτυποποίησης και ανάπτυξης προϊόντων", index: "004", title: "Σχεδιασμός → Πρωτότυπο", category: "Έρευνα & Ανάπτυξη", description: "Από την ιδέα σε λειτουργικό πρωτότυπο μέσα σε ημέρες.", tags: ["MVP", "Επανέλεγχος"], slug: "design-to-prototype" },
  { img: p3, alt: "Παγκόσμιο δίκτυο παραγωγής και συνεργατών", index: "005", title: "Μαζική Παραγωγή", category: "Κατασκευή", description: "Κατανεμημένη παραγωγή, κλιμάκωση και παγκόσμια παράδοση.", tags: ["Sourcing", "Κλιμάκωση"], slug: "global-manufacturing-network" },
];

export function PortfolioReel() {
  const { t, lang } = useI18n();
  const slides = lang === "GR" ? slidesGR : slidesEN;
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [padInline, setPadInline] = useState(16);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Compute padding so first & last cards center in the viewport
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const recalc = () => {
      const first = cardRefs.current[0];
      const last = cardRefs.current[cardRefs.current.length - 1];
      if (!first || !last) return;
      const padL = Math.max(16, (track.clientWidth - first.clientWidth) / 2);
      const padR = Math.max(16, (track.clientWidth - last.clientWidth) / 2);
      setPadInline(Math.max(padL, padR));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(track);
    cardRefs.current.forEach((c) => c && ro.observe(c));
    window.addEventListener("resize", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [slides.length]);

  // Track active index + start/end state
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
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
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    return () => track.removeEventListener("scroll", update);
  }, [slides.length, padInline]);

  const goTo = useCallback((i: number) => {
    const card = cardRefs.current[i];
    const track = trackRef.current;
    if (!card || !track) return;
    const target =
      card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
  }, []);

  // Wheel -> horizontal (only when meaningful, else let page scroll)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const canLeft = track.scrollLeft > 0;
      const canRight = track.scrollLeft + track.clientWidth < track.scrollWidth - 1;
      if ((delta < 0 && !canLeft) || (delta > 0 && !canRight)) return;
      e.preventDefault();
      track.scrollBy({ left: delta, behavior: "auto" });
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, []);

  // Click-and-drag (desktop)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let pointerId = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      isDown = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.style.scrollSnapType = "none";
      track.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    };
    const finish = () => {
      if (!isDown) return;
      isDown = false;
      track.style.cursor = "";
      track.style.scrollSnapType = "";
      if (moved) {
        // snap to nearest
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
        goTo(bestI);
        // suppress next click for ~250ms
        const blockClick = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        track.addEventListener("click", blockClick, { capture: true, once: true });
        setTimeout(() => track.removeEventListener("click", blockClick, { capture: true } as any), 250);
      }
    };
    track.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      track.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [goTo]);

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="relative w-full bg-[#0c1426] min-h-screen flex items-center overflow-hidden py-24 before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-24 before:pointer-events-none before:bg-[linear-gradient(180deg,#0c1426_0%,transparent_100%)] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-24 after:pointer-events-none after:bg-[linear-gradient(180deg,transparent_0%,#101a30_100%)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #05acff 1px, transparent 1px), linear-gradient(to bottom, #05acff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -left-40 top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #05acff, transparent 70%)" }}
      />

      <div className="relative z-10 w-full grid grid-cols-12 gap-6 lg:gap-10 items-center max-w-[1800px] mx-auto px-6 md:px-12">
        {/* LEFT — Title */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[14px] tracking-[0.4em] text-[#05acff]">
              {lang === "GR" ? "ΕΝΟΤΗΤΑ" : "SECTION"}
            </span>
            <span className="h-px w-10 bg-[#05acff] shadow-[0_0_8px_#05acff]" />
          </div>
          <h2 className="font-display font-bold leading-[0.85] tracking-tighter text-white text-[clamp(2.4rem,5vw,4.5rem)] mb-6">
            03 /<br />
            <span className="drop-shadow-[0_0_24px_rgba(5,172,255,0.45)] text-4xl text-[#05acff]">
              {lang === "GR" ? "ΔΥΝΑΤΟΤΗΤΕΣ" : "CAPABILITIES"}
            </span>
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-8">
            {t("portfolio.title")}
          </p>

          <div className="max-w-[260px]">
            <div className="flex items-center justify-between font-mono text-[14px] tracking-[0.3em] mb-2 text-[#05acff]">
              <span>{String(active + 1).padStart(2, "0")}</span>
              <span className="text-white/40">/ {String(slides.length).padStart(2, "0")}</span>
            </div>
            <div className="relative h-[3px] w-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 shadow-[0_0_10px_#05acff] transition-all duration-500 ease-out bg-[#05acff]"
                style={{ width: `${((active + 1) / slides.length) * 100}%` }}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <NavButton onClick={() => goTo(Math.max(0, active - 1))} dir="left" disabled={atStart} />
              <NavButton onClick={() => goTo(Math.min(slides.length - 1, active + 1))} dir="right" disabled={atEnd} />
            </div>
          </div>
        </div>

        {/* RIGHT — Carousel */}
        <div className="col-span-12 lg:col-span-9 xl:col-span-9 relative">
          <div
            ref={trackRef}
            className="flex gap-6 overflow-x-auto no-scrollbar py-6 overscroll-x-contain cursor-grab select-none"
            style={{
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              paddingLeft: padInline,
              paddingRight: padInline,
              WebkitOverflowScrolling: "touch",
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
                  onClick={() => {
                    if (i === active) {
                      navigate({ to: "/capabilities/$slug", params: { slug: s.slug } });
                    } else {
                      goTo(i);
                    }
                  }}
                  role="link"
                  aria-label={`Open ${s.title}`}
                  className={`group relative shrink-0 cursor-pointer transition-transform duration-500 ease-out will-change-transform
                    w-[78vw] sm:w-[55vw] md:w-[40vw] lg:w-[28vw] xl:w-[24vw]
                    aspect-[3/4]
                    hover:scale-[1.03]
                    ${isActive ? "opacity-100" : "opacity-55 hover:opacity-90"}
                  `}
                  style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
                >
                  <div
                    className={`absolute -inset-px transition-shadow duration-500 pointer-events-none ${
                      isActive
                        ? "shadow-[0_0_60px_-5px_#05acff,0_0_0_1px_#05acff]"
                        : "shadow-[0_0_0_1px_rgba(255,255,255,0.08)] group-hover:shadow-[0_0_40px_-10px_#05acff,0_0_0_1px_rgba(5,172,255,0.5)]"
                    }`}
                  />
                  <div className="relative h-full w-full overflow-hidden bg-black">
                    <img
                      src={s.img}
                      alt={s.alt}
                      loading={i < 2 ? "eager" : "lazy"}
                      draggable={false}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        isActive ? "scale-105" : "scale-100 grayscale group-hover:grayscale-0"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1426] via-[#0c1426]/40 to-transparent" />

                    {isActive && (
                      <div
                        aria-hidden
                        className="absolute left-0 right-0 h-px bg-[#05acff] shadow-[0_0_18px_#05acff]"
                        style={{ animation: "cap-scan 4s ease-in-out infinite" }}
                      />
                    )}

                    <Corner className={`top-3 left-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`top-3 right-3 rotate-90 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`bottom-3 left-3 -rotate-90 ${isActive ? "opacity-100" : "opacity-40"}`} />
                    <Corner className={`bottom-3 right-3 rotate-180 ${isActive ? "opacity-100" : "opacity-40"}`} />

                    <div className="absolute top-5 left-5 font-mono text-[14px] tracking-[0.3em] text-[#05acff]">
                      {s.index}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="font-mono text-[14px] tracking-[0.35em] mb-3 text-[#05acff]">
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
                            className="font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1 border border-[#05acff]/40 bg-[#05acff]/[0.05] text-[#05acff]"
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
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0c1426] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c1426] to-transparent" />

          {/* Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.index}
                onClick={() => goTo(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-8 bg-[#05acff] shadow-[0_0_10px_#05acff]"
                    : "w-2 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute w-4 h-4 border-t border-l border-[#05acff] shadow-[0_0_6px_rgba(5,172,255,0.5)] transition-opacity duration-500 ${className}`}
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
      className={`group relative w-12 h-12 border border-[#05acff]/40 bg-[#05acff]/[0.04] transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "hover:border-[#05acff] hover:bg-[#05acff]/[0.12] hover:shadow-[0_0_20px_-4px_#05acff]"}
      `}
    >
      <span className="absolute inset-0 flex items-center justify-center font-mono text-lg text-[#05acff]">
        {dir === "left" ? "←" : "→"}
      </span>
    </button>
  );
}
