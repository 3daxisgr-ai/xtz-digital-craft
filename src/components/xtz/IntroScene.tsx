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
      // ----- Cinematic boot sequence -----
      const boot = gsap.timeline({ defaults: { ease: "power3.out" } });

      // SCENE 01 — faint electric blue light in darkness
      boot
        .to(".ambient-blue", { opacity: 1, duration: 1.4 }, 0.2)
        .to(".ambient-particles", { opacity: 1, duration: 1.2 }, 0.4)

        // SCENE 02 — zoomed-in image revealed, then settles to full view
        .fromTo(
          ".scene-img-wrap",
          { opacity: 0, scale: 1.8 },
          { opacity: 1, scale: 1.4, duration: 1.8, ease: "power2.out" },
          0.9
        )

        // SCENE 03 — laser cuts: beam + sparks + smoke
        .fromTo(
          ".laser-beam",
          { opacity: 0, scaleX: 0 },
          { opacity: 1, scaleX: 1, duration: 0.9, ease: "power3.out" },
          1.6
        )
        .to(".sparks", { opacity: 1, duration: 0.5 }, "<0.1")
        .to(".smoke", { opacity: 0.55, duration: 1.2 }, "<")

        // settle to fully unzoomed
        .to(".scene-img-wrap", { scale: 1, duration: 2.4, ease: "power2.out" }, 1.8)

        // SCENE 04 — logo engraves out of darkness
        .fromTo(
          ".logo-engrave",
          { opacity: 0, filter: "blur(18px)", letterSpacing: "0.3em" },
          { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.02em", duration: 1.4, ease: "power2.out" },
          2.6
        )
        .to(".laser-beam", { opacity: 0, duration: 0.8 }, "-=0.5")
        .to(".sparks", { opacity: 0, duration: 0.8 }, "<")

        // SCENE 05 — slogan + xyz
        .fromTo(
          ".intro-slogan",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          "-=0.3"
        )
        .fromTo(
          ".intro-xyz",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 0.9, duration: 0.8 },
          "-=0.5"
        )

        // SCENE 06 / 07 — fire event so Navigation, lang, CTA, scroll hint reveal
        .add(() => {
          window.dispatchEvent(new CustomEvent("intro:ready"));
        }, "+=0.1")

        // SCENE 07 — scroll indicator
        .fromTo(
          ".scroll-hint",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8 },
          "+=0.6"
        );

      // ----- Scroll camera push-in (no fades to gray) -----
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#intro",
          start: "top top",
          end: "+=220%",
          scrub: 1.2,
          pin: true,
        },
      });

      tl.to(".scene-img-wrap", { scale: 1.3, ease: "none" }, 0);
      tl.to(".layer-logo", { scale: 0.55, y: -40, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".intro-slogan", { y: -60, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".intro-xyz", { y: -40, opacity: 0, ease: "power2.in" }, 0.02);
      tl.to(".layer-fg", { scale: 1.9, y: 60, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".scroll-hint", { opacity: 0, y: 20 }, 0);
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
      {/* Scene 01 — faint blue ambient */}
      <div className="ambient-blue absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, oklch(0.45 0.18 245 / 0.28) 0%, transparent 55%)",
        }} />

      {/* Scene 01 — ambient particles */}
      <div className="ambient-particles absolute inset-0 opacity-0 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 1.5}px`,
              height: `${1 + Math.random() * 1.5}px`,
              background: "oklch(0.85 0.18 245)",
              opacity: 0.25 + Math.random() * 0.35,
              boxShadow: "0 0 6px oklch(0.7 0.22 245 / 0.5)",
              animation: `floatY ${6 + Math.random() * 6}s ${Math.random() * 4}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* Scene 02 — zoomed laser background */}
      <div className="scene-img-wrap absolute inset-0 opacity-0 will-change-transform origin-center">
        <img
          src={heroOffice}
          alt="Fiber laser cutting steel with electric blue sparks in a dark industrial environment"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
      </div>

      {/* Scene 03 — laser beam */}
      <div className="laser-beam absolute top-1/2 left-0 w-full h-[2px] opacity-0 origin-left scale-x-0 pointer-events-none z-[6]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.85 0.22 245), oklch(1 0 0), oklch(0.85 0.22 245), transparent)",
          boxShadow:
            "0 0 14px oklch(0.72 0.22 245 / 0.7), 0 0 40px oklch(0.72 0.22 245 / 0.35)",
          filter: "blur(0.5px)",
        }} />

      {/* Subtle smoke */}
      <div className="smoke absolute inset-x-0 top-1/2 h-[40%] opacity-0 pointer-events-none z-[5] mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.6 0.05 245 / 0.22), transparent 60%)",
          filter: "blur(22px)",
        }} />

      {/* Sparks */}
      <div className="sparks absolute inset-0 opacity-0 pointer-events-none z-[6]">
        {Array.from({ length: 32 }).map((_, i) => {
          const a = Math.random() * Math.PI * 2;
          const d = 50 + Math.random() * 180;
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

      {/* Scene 04/05 — Logo engrave + texts */}
      <div className="layer-logo absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center will-change-transform">
        <div
          className="logo-engrave font-display font-bold leading-[0.85] text-[clamp(3rem,13vw,14rem)] tracking-tighter opacity-0"
          style={{
            color: "oklch(0.96 0.02 245)",
            textShadow:
              "0 0 14px oklch(0.7 0.22 245 / 0.35), 0 0 32px oklch(0.55 0.2 245 / 0.18)",
          }}
        >
          3D AXIS
        </div>
        <p className="intro-slogan opacity-0 mt-6 font-mono text-xs md:text-sm uppercase tracking-[0.5em] text-primary/90">
          FROM CONCEPT TO REALITY
        </p>
        <p className="intro-xyz opacity-0 mt-4 font-mono text-[10px] uppercase tracking-[0.55em] text-muted-foreground">
          XYZ — {t("intro.xyz")}
        </p>
      </div>

      {/* Vignette — used by scroll, never gray */}
      <div className="vignette absolute inset-0 opacity-0 pointer-events-none z-[15]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
        }} />

      {/* Foreground particles (scroll parallax) */}
      <div className="layer-fg absolute inset-0 pointer-events-none z-20 will-change-transform">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              background: "oklch(0.85 0.18 245)",
              opacity: 0.3 + Math.random() * 0.4,
              boxShadow: "0 0 6px oklch(0.7 0.22 245 / 0.6)",
              animation: `floatY ${6 + Math.random() * 6}s ${Math.random() * 4}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* Scroll indicator */}
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
