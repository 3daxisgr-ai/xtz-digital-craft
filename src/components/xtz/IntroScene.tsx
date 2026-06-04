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
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#intro",
          start: "top top",
          end: "+=240%",
          scrub: 1.2,
          pin: true,
        },
      });

      tl.to(".scene-img", { scale: 3.6, ease: "power2.inOut" }, 0)
        .to(".intro-headline", { scale: 1.4, opacity: 0, y: -40, ease: "power2.in" }, 0)
        .to(".scroll-hint", { opacity: 0 }, 0)
        .to(".vignette", { opacity: 1, ease: "power2.out" }, 0.1)
        .to(".blue-wash", { opacity: 0.45 }, 0.35)
        .to(".laser-beam", { scaleX: 1, opacity: 1, ease: "power3.out" }, 0.25)
        .to(".sparks", { opacity: 1 }, 0.4)
        .to(".reveal-stage", { opacity: 1, ease: "power2.out" }, 0.6)
        .to(".reveal-brand", { y: 0, opacity: 1, ease: "power3.out" }, 0.65)
        .to(".reveal-slogan", { y: 0, opacity: 1, ease: "power3.out" }, 0.75)
        .to(".reveal-xyz", { y: 0, opacity: 1, ease: "power3.out" }, 0.85)
        .to(".portal", { opacity: 0.7, scale: 1, ease: "power3.out" }, 0.9);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="intro"
      ref={root}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* Coordinate corner marks (XYZ motif) */}
      <CornerMarks />

      <div className="scene-img absolute inset-0 will-change-transform">
        <img
          src={heroOffice}
          alt="3D Axis design studio interior with brushed metal surfaces and blue ambient light"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/50" />
      </div>

      {/* Dark vignette deepens during push-in to preserve contrast */}
      <div className="vignette absolute inset-0 opacity-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.85) 100%)" }} />

      <div className="blue-wash absolute inset-0 opacity-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, oklch(0.55 0.22 245 / 0.35), transparent 60%)" }} />

      {/* Realistic laser beam */}
      <div className="laser-beam absolute top-1/2 left-0 w-full h-[2px] opacity-0 origin-left scale-x-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.85 0.22 245), oklch(1 0 0), oklch(0.85 0.22 245), transparent)",
          boxShadow: "0 0 20px oklch(0.72 0.22 245), 0 0 60px oklch(0.72 0.22 245 / 0.6), 0 0 120px oklch(0.72 0.22 245 / 0.3)",
          filter: "blur(0.5px)",
        }} />

      {/* Sparks */}
      <div className="sparks absolute inset-0 opacity-0 pointer-events-none">
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (Math.random() * Math.PI * 2);
          const d = 60 + Math.random() * 200;
          return (
            <span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-primary"
              style={{
                left: `${48 + Math.random() * 4}%`,
                top: `${49 + Math.random() * 2}%`,
                boxShadow: "0 0 6px oklch(0.85 0.22 245), 0 0 14px oklch(0.85 0.22 245 / 0.6)",
                ["--tx" as any]: `${Math.cos(a) * d}px`,
                ["--ty" as any]: `${Math.sin(a) * d}px`,
                animation: `spark ${0.6 + Math.random() * 1.4}s ${Math.random() * 0.8}s infinite ease-out`,
              }}
            />
          );
        })}
      </div>

      {/* Intro headline */}
      <div className="intro-headline absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6 animate-pulse-glow">
          {t("intro.kicker")}
        </div>
        <h1 className="font-display font-bold leading-[0.85] text-[clamp(3rem,13vw,14rem)] tracking-tighter text-glow">
          3D AXIS
        </h1>
        <p className="mt-6 max-w-xl text-lg md:text-2xl font-light text-foreground/80">
          {t("intro.slogan")}
        </p>
      </div>

      {/* Reveal stage after zoom */}
      <div className="reveal-stage absolute inset-0 z-20 opacity-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
        <div className="reveal-brand opacity-0 translate-y-10 font-display font-bold leading-[0.85] text-[clamp(3rem,14vw,15rem)] tracking-tighter text-glow">
          3D AXIS
        </div>
        <div className="reveal-slogan opacity-0 translate-y-6 mt-8 font-mono text-xs md:text-sm uppercase tracking-[0.6em] text-primary">
          {t("intro.slogan")}
        </div>
        <div className="reveal-xyz opacity-0 translate-y-4 mt-6 font-mono text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          {t("intro.xyz")}
        </div>
      </div>

      <div className="scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          {t("intro.scroll")}
        </span>
        <span className="block h-12 w-px bg-gradient-to-b from-primary to-transparent animate-pulse-glow" />
      </div>

      <div
        className="portal absolute inset-0 z-30 opacity-0 scale-75 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.55 0.18 245 / 0.35), transparent 65%)",
        }}
      />
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
      {marks.map((m) => (
        <span key={m.l} className={`absolute ${m.c} font-mono text-[10px] tracking-[0.3em] text-primary/70`}>{m.l}</span>
      ))}
    </div>
  );
}
