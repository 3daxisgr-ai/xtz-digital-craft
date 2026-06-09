import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "@tanstack/react-router";
import aboutBg from "@/assets/about-bg.png.asset.json";
import type { CapabilitySlug } from "./Capabilities";

gsap.registerPlugin(ScrollTrigger);

const specialties: { label: string; slug: CapabilitySlug }[] = [
  { label: "Design & Prototype", slug: "design-to-prototype" },
  { label: "Fiber Laser Cutting", slug: "fiber-laser-cutting" },
  { label: "Sheet Metal Forming & Welding", slug: "sheet-metal-forming-welding" },
  { label: "3D Printing", slug: "3d-printing" },
  { label: "​Mass production", slug: "global-manufacturing-network" },
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
      style={{
        backgroundImage: `url(${aboutBg.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/70" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, oklch(0.45 0.18 245 / 0.25), transparent 60%)",
        }}
      />
      <span className="absolute top-8 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        ABOUT US
      </span>
      <span className="absolute top-8 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12 grid md:grid-cols-12 gap-10 md:gap-16">
        <div className="ab-reveal md:col-span-6 space-y-8">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">01 /</span>
            <span className="h-px w-20 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              About SKG3D
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
            {specialties.map((s) => (
              <li key={s.label}>
                <Link
                  to="/capabilities/$slug"
                  params={{ slug: s.slug }}
                  className="group flex items-center gap-6 py-5 transition-colors hover:text-primary"
                >
                  <span className="font-display text-lg md:text-2xl font-medium tracking-tight">
                    {s.label}
                  </span>
                  <span className="ml-auto h-px flex-1 max-w-[60px] bg-primary/20 group-hover:bg-primary transition-colors" />
                </Link>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </section>
  );
}
