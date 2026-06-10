import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "@tanstack/react-router";
import aboutBg from "@/assets/about-bg.png.asset.json";
import type { CapabilitySlug } from "./Capabilities";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

const specialties: { tKey: string; slug: CapabilitySlug }[] = [
  { tKey: "cap.05.t", slug: "design-to-prototype" },
  { tKey: "cap.02.t", slug: "fiber-laser-cutting" },
  { tKey: "cap.03.t", slug: "sheet-metal-forming-welding" },
  { tKey: "cap.04.t", slug: "3d-printing" },
  { tKey: "cap.06.t", slug: "global-manufacturing-network" },
];


export function About() {
  const { t } = useI18n();
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
      className="relative w-full overflow-hidden py-28 md:py-40"
      style={{
        backgroundColor: "#11182a",
        backgroundImage: `url(${aboutBg.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Lighter, blue-tinted overlay (was bg-black/70) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(17,24,42,0.78) 0%, rgba(20,28,48,0.7) 50%, rgba(17,24,42,0.85) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, oklch(0.55 0.18 245 / 0.28), transparent 60%)",
        }}
      />
      {/* Soft top + bottom blend with neighboring sections */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(180deg, #0d1220 0%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{ background: "linear-gradient(180deg, transparent 0%, #131c33 100%)" }}
      />
      <span className="absolute top-8 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        {t("about.tag")}
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
              {t("about.kicker")}
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.9] tracking-tighter text-6xl">
            {t("about.title.l1")}
            {t("about.title.l2") && <><br />{t("about.title.l2")}</>}
            {t("about.title.l3") && <><br />{t("about.title.l3")}</>}
          </h2>
          <div className="space-y-5 text-base md:text-lg text-foreground/85 leading-relaxed font-light max-w-xl">
            <p>{t("about.body")}</p>
          </div>
        </div>

        <div className="ab-reveal md:col-span-6 md:pt-20">
          <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary/80 mb-6">
            {t("about.specialize")}
          </div>
          <ul className="divide-y divide-primary/15 border-y border-primary/15">
            {specialties.map((s) => (
              <li key={s.slug}>
                <Link
                  to="/capabilities/$slug"
                  params={{ slug: s.slug }}
                  className="group flex items-center gap-6 py-5 transition-colors hover:text-primary"
                >
                  <span className="font-display text-lg md:text-2xl font-medium tracking-tight">
                    {t(s.tKey)}
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
