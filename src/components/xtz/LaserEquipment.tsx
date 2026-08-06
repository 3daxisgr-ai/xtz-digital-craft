import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import laserMachine from "@/assets/akj-fiber-laser.jpg.asset.json";
import pressBrake from "@/assets/durmapress-stratza.webp.asset.json";
import welding from "@/assets/laser-welding.jpg.asset.json";

type Card = {
  id: string;
  title: string;
  image: string;
  alt: string;
  specs: { label: string; value: string }[];
};

const CARDS: Card[] = [
  {
    id: "fiber",
    title: "Fiber Laser Cutter 2kW",
    image: laserMachine.url,
    alt: "AKJ1530F fiber laser cutting machine",
    specs: [
      { label: "Power", value: "2 kW fiber source" },
      { label: "Accuracy", value: "±0.05 mm" },
      { label: "Bed Size", value: "1500 × 3000 mm" },
    ],
  },
  {
    id: "brake",
    title: "DURMAPRESS Press Brake",
    image: pressBrake.url,
    alt: "DURMAPRESS press brake bending sheet metal",
    specs: [
      { label: "Control", value: "Delem 6+1 axes" },
      { label: "Accuracy", value: "±0.1 mm angle" },
      { label: "Bed Size", value: "3100 mm" },
    ],
  },
  {
    id: "weld",
    title: "Welding Stations",
    image: welding.url,
    alt: "Welding station in workshop",
    specs: [
      { label: "Power", value: "MIG · TIG · Laser" },
      { label: "Accuracy", value: "Seam ±0.2 mm" },
      { label: "Bed Size", value: "2 workstations" },
    ],
  },
];

const CUT_DURATION = 1.4;

function LaserCard({ card, index }: { card: Card; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [cut, setCut] = useState(false);
  const delay = index * 0.35;

  useEffect(() => {
    if (!inView) return;
    const t = window.setTimeout(
      () => setCut(true),
      (delay + CUT_DURATION) * 1000,
    );
    return () => window.clearTimeout(t);
  }, [inView, delay]);

  return (
    <div ref={ref} className="relative">
      {/* Laser-cut border */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <motion.rect
          x="0.4"
          y="0.4"
          width="99.2"
          height="99.2"
          fill="none"
          stroke="#ff3300"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1 1"
          initial={{ strokeDashoffset: 1, opacity: 1 }}
          animate={inView ? { strokeDashoffset: 0 } : {}}
          transition={{ duration: CUT_DURATION, delay, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 3px #ff3300)" }}
        />
      </svg>

      {/* Glowing laser tip travelling the perimeter */}
      {inView && !cut && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ offsetPath: "none" }}
        >
          <motion.span
            className="absolute h-2 w-2 rounded-full will-change-transform"
            style={{
              top: 0,
              left: 0,
              background: "#ffffff",
              boxShadow:
                "0 0 6px 2px #ffffff, 0 0 18px 6px #ff3300, 0 0 40px 14px rgba(255,51,0,0.5)",
              offsetPath:
                "path('M 0 0 L 100 0 L 100 100 L 0 100 Z')",
              offsetRotate: "0deg",
            }}
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: CUT_DURATION, delay, ease: "linear" }}
          />
        </div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={cut ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
        style={{ backgroundColor: "rgba(18,18,21,0.85)" }}
      >
        <div className="relative aspect-[16/11] overflow-hidden bg-black">
          <img
            src={card.image}
            alt={card.alt}
            loading="lazy"
            className="h-full w-full object-cover opacity-80 transition-transform duration-700 ease-out hover:scale-[1.04]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,13,15,0.25) 0%, rgba(13,13,15,0.85) 100%)",
            }}
          />
        </div>

        <div className="space-y-5 p-6">
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white">
            {card.title}
          </h3>
          <ul className="space-y-2 font-mono text-[11px] uppercase tracking-[0.15em]">
            {card.specs.map((s) => (
              <li
                key={s.label}
                className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2"
              >
                <span className="text-white/40">{s.label}</span>
                <span className="text-right text-white/85">{s.value}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="w-full border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors duration-200"
            style={{ borderColor: "#ff3300", color: "#ff5b33" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ff3300";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#ff5b33";
            }}
          >
            View Specs
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function LaserEquipment() {
  return (
    <section
      className="relative w-full overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: "#0d0d0f" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 30%, black 40%, transparent 85%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="mb-14 md:mb-20">
          <div
            className="mb-4 font-mono text-[11px] uppercase tracking-[0.5em]"
            style={{ color: "#ff3300" }}
          >
            Machine Park
          </div>
          <h2 className="font-display text-[clamp(2rem,5.5vw,4rem)] font-bold uppercase leading-[0.95] tracking-tighter text-white">
            Heavy Duty Equipment
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <LaserCard key={c.id} card={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
