import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

export type CapabilitySlug =
  | "design-development"
  | "fiber-laser-cutting"
  | "sheet-metal-forming-welding"
  | "3d-printing"
  | "design-to-prototype"
  | "global-manufacturing-network";

export const capabilities: { n: string; slug: CapabilitySlug; tKey: string; dKey: string }[] = [
  { n: "", slug: "design-development", tKey: "cap.01.t", dKey: "cap.01.d" },
  { n: "", slug: "fiber-laser-cutting", tKey: "cap.02.t", dKey: "cap.02.d" },
  { n: "", slug: "sheet-metal-forming-welding", tKey: "cap.03.t", dKey: "cap.03.d" },
  { n: "", slug: "3d-printing", tKey: "cap.04.t", dKey: "cap.04.d" },
  { n: "", slug: "design-to-prototype", tKey: "cap.05.t", dKey: "cap.05.d" },
  { n: "", slug: "global-manufacturing-network", tKey: "cap.06.t", dKey: "cap.06.d" },
];

export function Capabilities() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from(".cap-card", {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: ".cap-grid", start: "top 85%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="capabilities"
      ref={root}
      className="relative w-full inox-surface py-28 md:py-36 overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 20% 0%, oklch(0.4 0.18 245 / 0.4), transparent 55%)" }}
      />
      <span className="absolute top-10 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        02 / CAPABILITIES
      </span>
      <span className="absolute top-10 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto max-w-[1500px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">02 /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("cap.kicker")}
          </span>
        </div>
        <h2 className="font-display font-bold leading-[0.95] text-[clamp(2.2rem,5.5vw,4.5rem)] tracking-tighter mb-6 max-w-4xl">
          {t("cap.title")}
        </h2>
        <p className="text-foreground/65 max-w-xl mb-16">{t("cap.body")}</p>

        <div className="cap-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c) => (
            <Link
              key={c.slug}
              to="/capabilities/$slug"
              params={{ slug: c.slug }}
              className="cap-card group relative p-8 border border-border/60 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden transition-colors hover:border-primary/60 block"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top, oklch(0.5 0.2 245 / 0.2), transparent 60%)" }}
              />
              <div
                aria-hidden
                className="absolute -top-px left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full blue-glow"
              />
              <div className="relative flex flex-col h-full min-h-[180px]">
                <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {t(c.tKey)}
                </h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{t(c.dKey)}</p>
                <span className="mt-auto pt-6 font-mono text-[14px] tracking-[0.3em] text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                  {t("cap.cta")} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
