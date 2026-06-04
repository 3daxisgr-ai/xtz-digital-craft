import { useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";

type Stat = { value: number; suffix: string; labelEN: string; labelGR: string };

const STATS: Stat[] = [
  { value: 500, suffix: "+", labelEN: "Projects Completed", labelGR: "Ολοκληρωμένα Έργα" },
  { value: 100, suffix: "+", labelEN: "Prototype Designs", labelGR: "Σχέδια Πρωτοτύπων" },
  { value: 50, suffix: "+", labelEN: "Tons Processed", labelGR: "Τόνοι Υλικών" },
  { value: 99, suffix: "%", labelEN: "Client Satisfaction", labelGR: "Ικανοποίηση Πελατών" },
];

export function Stats() {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setActive(true),
      { threshold: 0.35 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative w-full overflow-hidden bg-black py-28 md:py-40">
      <div className="absolute inset-0 brushed-metal opacity-20 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.4 0.2 245 / 0.25), transparent 60%)" }}
      />
      <span className="absolute top-10 right-6 md:right-12 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        X · Y · Z
      </span>

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-14">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {lang === "GR" ? "Δείκτες" : "By the Numbers"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-14 gap-x-6 md:gap-x-10">
          {STATS.map((s, i) => (
            <Counter
              key={i}
              target={s.value}
              suffix={s.suffix}
              label={lang === "GR" ? s.labelGR : s.labelEN}
              active={active}
              delay={i * 120}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({
  target, suffix, label, active, delay,
}: { target: number; suffix: string; label: string; active: boolean; delay: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let start = 0;
    const dur = 1800;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) { raf = requestAnimationFrame(tick); return; }
      if (!start) start = now;
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, delay]);

  return (
    <div className="relative pl-5 border-l border-primary/30">
      <div
        className="font-display font-bold leading-none tracking-tighter text-[clamp(2.6rem,7vw,5.5rem)] text-glow"
        style={{ color: "oklch(0.96 0.02 245)" }}
      >
        {n}
        <span className="text-primary">{suffix}</span>
      </div>
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
