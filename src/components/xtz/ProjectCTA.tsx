import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import ctaBg from "@/assets/cta-industrial.jpg";
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
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#04060d]/80" />
        {/* Blue tint overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, oklch(0.35 0.15 245 / 0.4), transparent 70%)",
          }}
        />
      </div>

      {/* Corner accents */}
      <span className="absolute top-6 left-6 md:top-10 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/40">
        — / INQUIRY
      </span>
      <span className="absolute top-6 right-6 md:top-10 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/40">
        XYZ
      </span>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-[1400px] flex-col items-center justify-center px-6 py-28 text-center md:px-12">
        <div className="cta-reveal">
          <span className="font-mono text-xs tracking-[0.4em] text-primary">
            READY TO BEGIN?
          </span>
        </div>

        <div className="cta-reveal mt-8 max-w-4xl">
          <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.9] tracking-tighter">
            <span className="text-white/90">HAVE A PROJECT</span>
            <br />
            <span className="text-primary text-glow">IN MIND?</span>
          </h2>
        </div>

        <div className="cta-reveal mt-10 max-w-2xl">
          <p className="font-display text-2xl md:text-3xl font-medium tracking-tight text-white/90 leading-snug">
            START HERE.
          </p>
        </div>

        <div className="cta-reveal mt-8 max-w-xl">
          <p className="text-base md:text-lg text-foreground/65 leading-relaxed">
            Whether you have a drawing, an existing design or simply an idea, we can help turn it into a real product.
          </p>
        </div>

        <div className="cta-reveal mt-6">
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Whether you need design, prototyping, manufacturing or production
            support, we&apos;re ready to help.
          </p>
        </div>

        <div className="cta-reveal mt-12">
          <Link
            to="/start-project"
            className="group relative inline-flex items-center gap-3 bg-primary px-10 py-5 font-mono text-xs tracking-[0.3em] text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_60px_-10px_oklch(0.72_0.18_245_/_0.5)]"
          >
            <span>START YOUR PROJECT</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <div className="cta-reveal mt-14">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {["DESIGN", "PROTOTYPE", "MANUFACTURE", "MASS PRODUCTION"].map(
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
