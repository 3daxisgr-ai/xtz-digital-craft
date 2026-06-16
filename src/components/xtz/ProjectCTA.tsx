import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import ctaBgAsset from "@/assets/cta-workshop.png.asset.json";
const ctaBg = ctaBgAsset.url;
import { useI18n } from "./i18n";

export function ProjectCTA() {
  const { t, lang } = useI18n();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll(".cta-reveal").forEach((child, i) => {
              setTimeout(() => {
                child.classList.add("cta-visible");
              }, i * 120);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={root}
      id="start-project"
      className="relative w-full overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={ctaBg}
          alt="Industrial manufacturing"
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay — lighter, blue-tinted */}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(16,26,48,0.72)" }} />
        {/* Blue tint overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, oklch(0.5 0.18 245 / 0.45), transparent 70%)",
          }}
        />
        {/* Top blend with previous section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: "linear-gradient(180deg, #101a30 0%, transparent 100%)" }}
        />
      </div>

      {/* Corner accents */}
      <span className="absolute top-6 left-6 md:top-10 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/40">
        {t("cta.tag")}
      </span>
      <span className="absolute top-6 right-6 md:top-10 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/40">
        XYZ
      </span>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[58vh] max-w-[1400px] flex-col items-center justify-center px-6 py-20 md:py-24 text-center md:px-12">
        <div className="cta-reveal">
          <span className="font-mono text-xs tracking-[0.4em] text-primary">
            {t("cta.kicker")}
          </span>
        </div>

        <div className="cta-reveal mt-8 max-w-4xl">
          <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.9] tracking-tighter">
            <span className="text-white/90">{t("cta.title.l1")}</span>
            <br />
            <span className="text-primary text-glow">{t("cta.title.l2")}</span>
          </h2>
        </div>

        <div className="cta-reveal mt-10 max-w-2xl">
          <Link
            to="/start"
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-full border border-white/30 bg-white/[0.06] backdrop-blur-xl font-mono text-sm uppercase tracking-[0.45em] text-white transition-all duration-500 hover:bg-white/[0.14] hover:border-white/60 hover:scale-[1.03]"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 32px -8px rgba(5,172,255,0.35), 0 0 60px -20px rgba(5,172,255,0.5)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(5,172,255,0.25), transparent 70%)",
              }}
            />
            <span className="relative">{t("cta.lead")}</span>
            <span className="relative transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="cta-reveal mt-8 max-w-xl">
          <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
            {t("cta.body1")}
          </p>
        </div>

        <div className="cta-reveal mt-6">
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {t("cta.body2")}
          </p>
        </div>

        <div className="cta-reveal mt-14">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {(lang === "GR"
              ? ["ΣΧΕΔΙΑΣΜΟΣ", "ΠΡΩΤΟΤΥΠΟ", "ΚΑΤΑΣΚΕΥΗ", "ΠΑΡΑΔΟΣΗ"]
              : ["DESIGN", "PROTOTYPE", "MANUFACTURE", "DELIVER"]
            ).map(
              (word, i) => (
                <span key={word} className="flex items-center gap-4">
                  <span className="font-mono text-[11px] tracking-[0.35em] text-primary/70">
                    {word}
                  </span>
                  {i < 3 && (
                    <span className="h-1 w-1 rounded-full bg-primary/40" />
                  )}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom scan line */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-primary/20"
      />

      <style>{`
        .cta-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cta-reveal.cta-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
