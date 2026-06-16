import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Clock, Zap, PenTool } from "lucide-react";
import { useI18n } from "./i18n";

const metrics = [
  { value: "2000+", labelEN: "Printing Hours", labelGR: "Ώρες Εκτύπωσης", Icon: Clock },
  { value: "900+", labelEN: "Laser Cutting Hours", labelGR: "Ώρες Κοπής Laser", Icon: Zap },
  { value: "300+", labelEN: "CAD Design Hours", labelGR: "Ώρες Σχεδιασμού CAD", Icon: PenTool },
];

export function Metrics() {
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useI18n();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".metric-card", {
        y: 20,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 90%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-label="Key metrics"
      className="relative z-10 w-full overflow-hidden py-16 md:py-20"
      style={{ backgroundColor: "#0d1220" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.5 0.18 245 / 0.25), transparent 65%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          {metrics.map((m) => (
            <div
              key={m.value}
              className="metric-card group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-7 py-9 md:px-9 md:py-11 transition-all duration-500 hover:border-primary/50 hover:bg-white/[0.06]"
              style={{
                boxShadow:
                  "0 8px 32px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(5,172,255,0.18), transparent 70%)",
                }}
              />
              <div className="relative flex flex-col items-start gap-3">
                <m.Icon className="h-5 w-5 text-primary/60 mb-1" strokeWidth={1.5} />
                <div
                  className="font-display font-bold leading-none tracking-tighter text-[clamp(2.6rem,5.5vw,4rem)] text-white"
                  style={{ textShadow: "0 0 28px rgba(5,172,255,0.35)" }}
                >
                  {m.value}
                </div>
                <div className="font-mono text-[11px] md:text-xs uppercase tracking-[0.35em] text-primary/85">
                  {lang === "GR" ? m.labelGR : m.labelEN}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
