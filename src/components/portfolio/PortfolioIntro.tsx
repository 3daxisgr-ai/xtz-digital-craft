// One-shot cinematic intro: blueprint → drawing → STEP → wireframe → solid →
// explode → assemble → material → UI. ~4.6s, respects prefers-reduced-motion.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const PHASES = [
  { at: 0, label: "BLUEPRINT" },
  { at: 600, label: "TECHNICAL DRAWING" },
  { at: 1200, label: "STEP FILE" },
  { at: 1800, label: "WIREFRAME" },
  { at: 2400, label: "SOLID MODEL" },
  { at: 3000, label: "EXPLODED" },
  { at: 3500, label: "ASSEMBLY" },
  { at: 4000, label: "MATERIAL" },
  { at: 4500, label: "READY" },
];

export function PortfolioIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (reduced) {
      doneRef.current();
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setT(elapsed);
      if (elapsed < 4900) raf = requestAnimationFrame(tick);
      else doneRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  if (reduced) return null;

  const phase = PHASES.reduce((acc, p, i) => (t >= p.at ? i : acc), 0);
  const draw = Math.min(1, Math.max(0, (t - 400) / 1100));
  const explode = phase === 5 ? 1 : phase > 5 ? Math.max(0, 1 - (t - 3500) / 500) : 0;
  const solid = t > 2400 ? Math.min(1, (t - 2400) / 500) : 0;
  const wire = t > 1800 && t < 2900 ? 1 : t <= 1800 ? Math.min(1, Math.max(0, (t - 1750) / 200)) : 0.15;
  const material = Math.min(1, Math.max(0, (t - 4000) / 500));
  const rot = Math.min(38, (t / 4600) * 38);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
      style={{ background: "#0B0F14" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: t > 4600 ? 0 : 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* blueprint grid */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(90,169,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(90,169,255,0.10) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: t > 2600 ? 0.18 : 0.6, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(90,169,255,0.14), transparent 62%)" }}
      />

      <svg viewBox="-160 -120 320 240" className="relative w-[min(78vw,640px)]" style={{ transform: `rotateX(14deg) rotateY(${rot}deg)` }}>
        <defs>
          <linearGradient id="introSteel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbe4ef" />
            <stop offset="45%" stopColor="#93a2b4" />
            <stop offset="55%" stopColor="#6f7d8e" />
            <stop offset="100%" stopColor="#b7c3d1" />
          </linearGradient>
        </defs>

        {/* dimension lines — technical drawing phase */}
        <motion.g
          stroke="#5aa9ff"
          strokeWidth="0.6"
          opacity={t > 600 && t < 2400 ? 0.85 : 0}
          style={{ transition: "opacity .4s" }}
        >
          <line x1="-120" y1="-86" x2="120" y2="-86" />
          <line x1="-120" y1="-92" x2="-120" y2="-80" />
          <line x1="120" y1="-92" x2="120" y2="-80" />
          <text x="0" y="-92" fill="#5aa9ff" fontSize="8" textAnchor="middle" fontFamily="monospace">
            240.00
          </text>
          <line x1="-134" y1="-70" x2="-134" y2="70" />
          <text x="-140" y="0" fill="#5aa9ff" fontSize="8" textAnchor="middle" fontFamily="monospace" transform="rotate(-90,-140,0)">
            140.00
          </text>
        </motion.g>

        {/* assembly parts */}
        {[
          { d: "M-110,40 L110,40 L110,64 L-110,64 Z", dx: 0, dy: 46 },
          { d: "M-110,-58 L-84,-58 L-84,40 L-110,40 Z", dx: -52, dy: 0 },
          { d: "M-84,-6 L-20,40 L-84,40 Z", dx: -18, dy: 30 },
          { d: "M30,-30 L86,-30 L86,20 L30,20 Z", dx: 42, dy: -40 },
        ].map((p, i) => (
          <g key={i} transform={`translate(${p.dx * explode} ${p.dy * explode})`}>
            <path
              d={p.d}
              fill={material > 0 ? "url(#introSteel)" : `rgba(148,170,200,${0.55 * solid})`}
              fillOpacity={solid}
              stroke="#7fc0ff"
              strokeWidth="1.1"
              strokeOpacity={Math.max(wire, draw)}
              strokeDasharray="600"
              strokeDashoffset={600 * (1 - draw)}
            />
          </g>
        ))}
        <circle
          cx="58"
          cy="-5"
          r="14"
          fill={material > 0 ? "#c9a23f" : "none"}
          fillOpacity={solid * material}
          stroke="#7fc0ff"
          strokeWidth="1.1"
          strokeOpacity={Math.max(wire, draw)}
          transform={`translate(${42 * explode} ${-40 * explode})`}
        />
      </svg>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#5aa9ff]">{PHASES[phase].label}</div>
        <div className="mt-3 h-px w-56 overflow-hidden bg-white/10">
          <motion.div className="h-full bg-[#5aa9ff]" style={{ width: `${Math.min(100, (t / 4600) * 100)}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.3em] text-white/35 transition-colors hover:text-white/70"
      >
        SKIP
      </button>
    </motion.div>
  );
}

export default PortfolioIntro;
