import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const cards = [
  {
    n: "01",
    title: "Product Development",
    body: "Transform concepts into real products through design, prototyping and manufacturing.",
  },
  {
    n: "02",
    title: "Sheet Metal Components",
    body: "Precision laser cut and formed metal parts for industrial and commercial applications.",
  },
  {
    n: "03",
    title: "Functional Prototypes",
    body: "Rapid iteration and testing using advanced additive manufacturing.",
  },
  {
    n: "04",
    title: "Scalable Manufacturing",
    body: "From single prototypes to production-ready solutions through trusted manufacturing partners.",
  },
];

const capabilities = [
  "Design & Development",
  "Fiber Laser Cutting",
  "Sheet Metal Forming",
  "Welding & Assembly",
  "3D Printing",
  "Custom Manufacturing",
];

const printingUses = [
  "Rapid Prototyping",
  "Functional Parts",
  "Custom Components",
  "Small Production Runs",
  "Medium Production Runs",
];

export function Capabilities() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cap-card", {
        opacity: 0, y: 60, duration: 0.9, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ".cap-grid", start: "top 80%" },
      });
      gsap.from(".cap-row", {
        opacity: 0, x: -30, duration: 0.8, stagger: 0.06, ease: "power3.out",
        scrollTrigger: { trigger: ".cap-list", start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="capabilities"
      ref={root}
      className="relative w-full bg-black py-32 md:py-44 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 20% 0%, oklch(0.4 0.18 245 / 0.4), transparent 55%)" }}
      />
      <span className="absolute top-10 left-6 md:left-12 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        — / CAPABILITIES
      </span>
      <span className="absolute top-10 right-6 md:right-12 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto max-w-[1500px] px-6 md:px-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            What Can We Build Together?
          </span>
        </div>
        <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5.5rem)] tracking-tighter mb-20 max-w-4xl">
          What can we build<br />together?
        </h2>

        {/* Premium cards */}
        <div className="cap-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-32">
          {cards.map((c) => (
            <article
              key={c.n}
              className="cap-card group relative p-8 border border-border/60 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden transition-colors hover:border-primary/60"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top, oklch(0.5 0.2 245 / 0.25), transparent 60%)" }}
              />
              <div
                aria-hidden
                className="absolute -top-px left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full blue-glow"
              />
              <div className="relative">
                <div className="font-mono text-[10px] tracking-[0.4em] text-primary/80 mb-6">
                  {c.n}
                </div>
                <h3 className="font-display text-2xl md:text-[1.65rem] font-semibold leading-tight tracking-tight mb-4 group-hover:text-primary transition-colors">
                  {c.title}
                </h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{c.body}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Services list */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 mb-28">
          <div className="lg:col-span-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary mb-6">
              Services / Capabilities
            </div>
            <h3 className="font-display font-bold leading-[0.95] text-[clamp(2rem,4.5vw,3.5rem)] tracking-tight mb-6">
              A complete engineering partner.
            </h3>
            <p className="text-foreground/65 leading-relaxed max-w-md">
              Not a laser shop. Not a print shop. A full-stack manufacturing partner taking
              projects from concept to scalable production.
            </p>
          </div>
          <ul className="cap-list lg:col-span-7 divide-y divide-border/50 border-y border-border/50">
            {capabilities.map((s, i) => (
              <li
                key={s}
                className="cap-row group flex items-center justify-between py-6 hover:bg-white/[0.015] transition-colors px-2"
              >
                <div className="flex items-center gap-6">
                  <span className="font-mono text-[10px] text-primary/70 tracking-[0.3em] w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-xl md:text-2xl tracking-tight">{s}</span>
                </div>
                <span className="font-mono text-primary text-sm opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                  →
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3D Printing emphasis */}
        <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 p-8 md:p-12 border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.55 0.22 245 / 0.6), transparent 70%)" }}
          />
          <div className="relative lg:col-span-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary mb-5">
              Additive Manufacturing
            </div>
            <h3 className="font-display font-bold text-[clamp(1.8rem,3.5vw,2.75rem)] leading-tight tracking-tight mb-5">
              3D Printing — beyond prototypes.
            </h3>
            <p className="text-foreground/65 leading-relaxed max-w-md text-sm md:text-base">
              Industrial additive manufacturing is no longer only for early-stage models. We deliver
              functional, end-use components and small to medium production runs with engineering
              polymers.
            </p>
          </div>
          <ul className="relative lg:col-span-7 grid sm:grid-cols-2 gap-3 content-start">
            {printingUses.map((u, i) => (
              <li
                key={u}
                className="flex items-center gap-4 border border-border/50 px-4 py-3.5 bg-black/40"
              >
                <span className="font-mono text-[10px] text-primary tracking-[0.3em]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-4 bg-primary/60" />
                <span className="font-display text-base">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
