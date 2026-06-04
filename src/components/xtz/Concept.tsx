import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroOffice from "@/assets/hero-office.jpg";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

export function Concept() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from(".cn-reveal > *", {
        y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="concept"
      ref={root}
      className="relative min-h-[80vh] w-full overflow-hidden bg-black flex items-center py-24"
    >
      <div className="absolute inset-0">
        <img
          src={heroOffice}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          width={1920}
          height={1080}
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 15% 50%, oklch(0.5 0.2 245 / 0.3), transparent 55%)" }}
        />
      </div>

      <span className="absolute top-10 left-6 md:left-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        — / WHAT WE DO
      </span>
      <span className="absolute top-10 right-6 md:right-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 md:px-12">
        <div className="cn-reveal max-w-2xl space-y-7">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
            <span className="h-px w-24 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("concept.kicker")}
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.95] text-[clamp(2rem,5.5vw,4.5rem)] tracking-tighter">
            {t("concept.title")}
          </h2>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed font-light max-w-xl">
            {t("concept.body")}
          </p>
          <div className="pt-2">
            <a
              href="#inquiry"
              className="inline-flex items-center gap-3 px-6 py-3 border border-primary/60 hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-[11px] uppercase tracking-[0.35em] blue-glow"
            >
              {t("concept.cta")} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
