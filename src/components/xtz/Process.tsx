import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { n: "01", t: "Design", d: "Concept, CAD modelling, material studies." },
  { n: "02", t: "Engineering", d: "Tolerances, nesting, structural validation." },
  { n: "03", t: "Laser Cutting", d: "Fiber laser precision to ±0.05mm." },
  { n: "04", t: "Finishing", d: "Brushed, anodised, powder-coated, hand-polished." },
  { n: "05", t: "Delivery", d: "White-glove logistics. Installed where it lives." },
];

export function Process() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".pr-step", {
        opacity: 0, y: 80, stagger: 0.15, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".pr-line", {
        scaleY: 0, transformOrigin: "top", duration: 1.6, ease: "power2.inOut",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" ref={root} className="relative min-h-screen w-full bg-black py-32 overflow-hidden">
      <div className="absolute inset-0 opacity-30"
        style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.15 245 / 0.4), transparent 60%)" }} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-12">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">05 /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Process</span>
        </div>
        <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,7vw,6rem)] tracking-tighter mb-24 max-w-4xl">
          From idea to installation.
        </h2>

        <div className="relative">
          <div className="pr-line absolute left-6 md:left-12 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent blue-glow" />
          <ul className="space-y-16 md:space-y-24">
            {steps.map((s) => (
              <li key={s.n} className="pr-step relative grid grid-cols-[60px_1fr] md:grid-cols-[120px_1fr_2fr] gap-6 md:gap-12 items-baseline">
                <span className="relative -ml-1 md:-ml-1">
                  <span className="absolute -left-[5px] top-2 h-3 w-3 rounded-full bg-primary blue-glow" />
                  <span className="block pl-8 md:pl-16 font-mono text-xs text-primary tracking-[0.3em]">{s.n}</span>
                </span>
                <h3 className="font-display font-bold text-2xl md:text-5xl tracking-tight">{s.t}</h3>
                <p className="col-start-2 md:col-start-3 text-foreground/60 md:text-lg max-w-md">{s.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
