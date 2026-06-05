import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const specialties = [
  "Design & Development",
  "Fiber Laser Cutting",
  "Sheet Metal Forming & Welding",
  "3D Printing",
  "Design → Prototype",
  "​Mass production",
];

export function About() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ab-reveal > *", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={root}
      className="relative w-full overflow-hidden bg-black py-28 md:py-40"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, oklch(0.45 0.18 245 / 0.25), transparent 60%)",
        }}
      />
      <span className="absolute top-8 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        — / ABOUT
      </span>
      <span className="absolute top-8 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12 grid md:grid-cols-12 gap-10 md:gap-16">
        <div className="ab-reveal md:col-span-6 space-y-8">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
            <span className="h-px w-20 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              About INOO3D
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5.5rem)] tracking-tighter">
            A COMPLETE<br />MANUFACTURING<br />PARTNER.
          </h2>
          <div className="space-y-5 text-base md:text-lg text-foreground/75 leading-relaxed font-light max-w-xl">
            <p>Not a laser shop. Not a print shop. A full-stack manufacturing partner taking projects from concept to scalable production , under one roof.</p>
          </div>
        </div>

        <div className="ab-reveal md:col-span-6 md:pt-20">
          <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary/80 mb-6">
            We specialize in
          </div>
          <ul className="divide-y divide-primary/15 border-y border-primary/15">
            {specialties.map((s, i) => (
              <li
                key={s}
                className="group flex items-center gap-6 py-5 transition-colors hover:text-primary"
              >
                <span className="font-mono text-[11px] text-primary/60 tracking-[0.2em] w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-lg md:text-2xl font-medium tracking-tight">
                  {s}
                </span>
                <span className="ml-auto h-px flex-1 max-w-[60px] bg-primary/20 group-hover:bg-primary transition-colors" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
