import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroOffice from "@/assets/hero-office.jpg";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

export function IntroScene() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ---- Intro boot sequence (Scenes 01 → 05) ----
      const boot = gsap.timeline({ defaults: { ease: "power3.out" } });
      boot
        .to(".surface-dark", { opacity: 0.55, duration: 1.6 }, 0)
        .to(".ambient-blue", { opacity: 1, duration: 2.0 }, 0.2)
        .fromTo(
          ".power-line",
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 1.4, ease: "power2.inOut" },
          0.6
        )
        .to(".power-line", { opacity: 0.9, duration: 0.6 }, "+=0.1")
        .to(".laser-beam", { opacity: 1, scaleX: 1, duration: 0.9, ease: "power3.out" }, "-=0.2")
        .to(".sparks", { opacity: 1, duration: 0.5 }, "<0.1")
        .to(".smoke", { opacity: 0.5, duration: 1.2 }, "<")
        .to(".scene-img", { opacity: 1, duration: 1.4, ease: "power2.out" }, "-=0.4")
        .fromTo(
          ".logo-engrave",
          { opacity: 0, filter: "blur(14px)" },
          { opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power2.out" },
          "-=0.6"
        )
        .to(".laser-beam", { opacity: 0, duration: 0.8 }, "-=0.3")
        .to(".sparks", { opacity: 0, duration: 0.8 }, "<")
        .fromTo(
          ".intro-slogan",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          "-=0.4"
        )
        .fromTo(
          ".intro-xyz",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 0.9, duration: 0.8 },
          "-=0.5"
        )
        .fromTo(
          ".scroll-hint",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.3"
        );

      // ---- Scroll camera push-in (Scene 06) ----
      // No fades to gray/white. Only depth, scale, parallax.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#intro",
          start: "top top",
          end: "+=220%",
          scrub: 1.2,
          pin: true,
        },
      });

      // Layer 1 (background) - slow forward push
      tl.to(".layer-bg", { scale: 1.35, ease: "none" }, 0);
      // Layer 2 (logo) - medium movement, scales down as camera moves past
      tl.to(".layer-logo", { scale: 0.55, y: -40, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".intro-slogan", { y: -60, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".intro-xyz", { y: -40, opacity: 0, ease: "power2.in" }, 0.02);
      // Layer 3 (foreground particles) - fast
      tl.to(".layer-fg", { scale: 1.9, y: 60, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".scroll-hint", { opacity: 0, y: 20 }, 0);
      // Deepen vignette to keep contrast (no gray overlay)
      tl.to(".vignette", { opacity: 1, ease: "power2.out" }, 0);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="intro"
      ref={root}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <CornerMarks />

      {/* Scene 01 — dark metallic surface */}
      <div className="surface-dark absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 60%, oklch(0.18 0.02 245) 0%, #050505 60%), repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px)",
        }} />

      {/* Scene 01 — blue ambient light */}
      <div className="ambient-blue absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 70%, oklch(0.45 0.18 245 / 0.18) 0%, transparent 55%)",
        }} />

      {/* LAYER 1 — Background office (slow) */}
      <div className="layer-bg scene-img absolute inset-0 opacity-0 will-change-transform">
        <img
          src={heroOffice}
          alt="3D Axis design studio interior with brushed metal surfaces and blue ambient light"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      {/* Scene 02 — electric blue power line */}
      <div className="power-line absolute top-1/2 left-0 w-full h-px origin-left pointer-events-none z-[5]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.7 0.2 245 / 0.9), transparent)",
          boxShadow: "0 0 8px oklch(0.7 0.2 245 / 0.6)",
        }} />

      {/* Scene 03 — laser beam */}
      <div className="laser-beam absolute top-1/2 left-0 w-full h-[2px] opacity-0 origin-left scale-x-0 pointer-events-none z-[6]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.85 0.22 245), oklch(1 0 0), oklch(0.85 0.22 245), transparent)",
          boxShadow:
            "0 0 14px oklch(0.72 0.22 245 / 0.7), 0 0 40px oklch(0.72 0.22 245 / 0.35)",
          filter: "blur(0.5px)",
        }} />

      {/* Light smoke */}
      <div className="smoke absolute inset-x-0 top-1/2 h-[40%] opacity-0 pointer-events-none z-[5] mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.6 0.05 245 / 0.18), transparent 60%)",
          filter: "blur(20px)",
        }} />

      {/* Sparks */}
      <div className="sparks absolute inset-0 opacity-0 pointer-events-none z-[6]">
        {Array.from({ length: 28 }).map((_, i) => {
          const a = Math.random() * Math.PI * 2;
          const d = 50 + Math.random() * 160;
          return (
            <span
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-primary"
              style={{
                left: `${49 + Math.random() * 2}%`,
                top: `${49.5 + Math.random() * 1}%`,
                boxShadow:
                  "0 0 4px oklch(0.85 0.22 245), 0 0 10px oklch(0.85 0.22 245 / 0.5)",
                ["--tx" as any]: `${Math.cos(a) * d}px`,
                ["--ty" as any]: `${Math.sin(a) * d}px`,
                animation: `spark ${0.6 + Math.random() * 1.4}s ${Math.random() * 0.8}s infinite ease-out`,
              }}
            />
          );
        })}
      </div>

      {/* LAYER 2 — Logo (medium movement) */}
      <div className="layer-logo absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center will-change-transform">
        <div
          className="logo-engrave font-display font-bold leading-[0.85] text-[clamp(3rem,13vw,14rem)] tracking-tighter"
          style={{
            color: "oklch(0.96 0.02 245)",
            textShadow:
              "0 0 14px oklch(0.7 0.22 245 / 0.35), 0 0 32px oklch(0.55 0.2 245 / 0.18)",
          }}
        >
          3D AXIS
        </div>
        <p className="intro-slogan opacity-0 mt-6 font-mono text-xs md:text-sm uppercase tracking-[0.5em] text-primary/90">
          {t("intro.slogan")}
        </p>
        <p className="intro-xyz opacity-0 mt-4 font-mono text-[10px] uppercase tracking-[0.55em] text-muted-foreground">
          {t("intro.xyz")}
        </p>
      </div>

      {/* Dark vignette - preserves contrast during push-in */}
      <div className="vignette absolute inset-0 opacity-0 pointer-events-none z-[15]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
        }} />

      {/* LAYER 3 — Foreground particles (fast) */}
      <div className="layer-fg absolute inset-0 pointer-events-none z-20 will-change-transform">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              background: "oklch(0.85 0.18 245)",
              opacity: 0.35 + Math.random() * 0.4,
              boxShadow: "0 0 6px oklch(0.7 0.22 245 / 0.6)",
              animation: `floatY ${6 + Math.random() * 6}s ${Math.random() * 4}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* Scroll indicator — animated dot inside line */}
      <div className="scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 opacity-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          {t("intro.scroll")}
        </span>
        <span className="relative block h-14 w-px overflow-hidden bg-white/10">
          <span
            className="absolute left-1/2 -translate-x-1/2 h-3 w-px bg-primary"
            style={{
              boxShadow: "0 0 6px oklch(0.7 0.22 245)",
              animation: "scrollDot 2.2s ease-in-out infinite",
            }}
          />
        </span>
      </div>
    </section>
  );
}

function CornerMarks() {
  const marks = [
    { c: "top-6 left-6 md:top-10 md:left-10", l: "XYZ" },
    { c: "top-6 right-6 md:top-10 md:right-10 text-right", l: "XYZ" },
    { c: "bottom-6 left-6 md:bottom-10 md:left-10", l: "XYZ" },
    { c: "bottom-6 right-6 md:bottom-10 md:right-10 text-right", l: "XYZ" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {marks.map((m, i) => (
        <span key={i} className={`absolute ${m.c} font-mono text-[10px] tracking-[0.3em] text-primary/70`}>{m.l}</span>
      ))}
    </div>
  );
}
