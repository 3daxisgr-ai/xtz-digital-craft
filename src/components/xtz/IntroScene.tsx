import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import toreoLogo from "@/assets/toreo-white-logo.png.asset.json";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

export function IntroScene() {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useI18n();

  // Keep the hero video alive on mobile (iOS Safari pauses background video on scroll)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    const onPause = () => {
      // Re-resume if it was paused by the OS while still on screen
      if (!document.hidden) tryPlay();
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) tryPlay();
        });
      },
      { threshold: 0.05 },
    );
    io.observe(v);
    document.addEventListener("visibilitychange", onVisibility);
    v.addEventListener("pause", onPause);
    v.addEventListener("stalled", tryPlay);
    v.addEventListener("suspend", tryPlay);
    window.addEventListener("focus", tryPlay);
    window.addEventListener("pageshow", tryPlay);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("stalled", tryPlay);
      v.removeEventListener("suspend", tryPlay);
      window.removeEventListener("focus", tryPlay);
      window.removeEventListener("pageshow", tryPlay);
    };
  }, []);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 768px)").matches;

    const ctx = gsap.context(() => {
      // Boot
      const boot = gsap.timeline({ defaults: { ease: "power3.out" } });
      boot
        .to(".ambient-blue", { opacity: 1, duration: 1.0 }, 0.1)
        .fromTo(
          ".scene-img-wrap",
          { opacity: 0, scale: reduced ? 1 : 1.25 },
          { opacity: 1, scale: 1, duration: reduced ? 0.6 : 1.6, ease: "power2.out" },
          0.2,
        )
        .fromTo(
          ".hero-headline",
          { y: 30, opacity: 0, filter: "blur(12px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.0 },
          0.6,
        )
        .fromTo(".hero-cta", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.3")
        .fromTo(".intro-xyz", { y: 10, opacity: 0 }, { y: 0, opacity: 0.7, duration: 0.6 }, "-=0.3")
        .add(() => {
          window.dispatchEvent(new CustomEvent("intro:ready"));
        }, "+=0.05")
        .fromTo(".scroll-hint", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, "+=0.3");

      // Disable scroll pin on mobile — pinning causes iOS to suspend the background video
      if (reduced || isMobile) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#intro",
          start: "top top",
          end: "+=120%",
          scrub: 1,
          pin: true,
        },
      });
      tl.to(".scene-img-wrap", { scale: 1.12, ease: "none" }, 0);
      tl.to(".hero-layer", { y: -60, opacity: 0, ease: "power2.in" }, 0);
      tl.to(".scroll-hint", { opacity: 0, y: 16 }, 0);
      tl.to(".vignette", { opacity: 1, ease: "power2.out" }, 0);
    }, root);
    return () => ctx.revert();
  }, []);


  return (
    <section id="intro" ref={root} className="relative h-screen w-full overflow-hidden bg-black">
      {/* Ambient blue */}
      <div
        className="ambient-blue absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 55%, oklch(0.45 0.18 245 / 0.28) 0%, transparent 55%)",
        }}
      />

      {/* Hero video background */}
      <div className="scene-img-wrap absolute inset-0 opacity-0 will-change-transform origin-center">
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/dozthoxxp/video/upload/copy_D88C4D5F-6765-4B35-B108-A8698361C726_rzq8il.mp4"
          autoPlay
          muted
          loop
          playsInline
          {...({ "webkit-playsinline": "true" } as Record<string, string>)}
          disablePictureInPicture

          disableRemotePlayback
          preload="auto"
          controls={false}
          className="h-full w-full object-cover"
          style={{ width: "100%", height: "100%" }}
        />

        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/55" />
      </div>

      {/* Hero text layer */}
      <div className="hero-layer absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center will-change-transform">
        <h1 className="hero-headline flex items-center justify-center">
          <span className="sr-only">TOREO — Precision Fabrication & Manufacturing. </span>
          <img
            src={toreoLogo.url}
            alt="TOREO"
            aria-hidden="true"
            className="block w-auto object-contain"
            style={{
              height: "clamp(6rem, 22vw, 22rem)",
              filter:
                "drop-shadow(0 0 24px oklch(0.65 0.22 245 / 0.45)) drop-shadow(0 0 60px oklch(0.55 0.22 245 / 0.25))",
            }}
          />
        </h1>

        {/* Glassmorphism CTA */}
        <a
          href="/start"
          className="hero-cta group relative mt-8 inline-flex items-center gap-3 px-9 py-4 rounded-full border border-white/30 bg-white/[0.06] backdrop-blur-xl font-mono text-[12px] uppercase tracking-[0.45em] text-white transition-all duration-500 hover:bg-white/[0.14] hover:border-white/60 hover:scale-[1.03]"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 32px -8px rgba(5,172,255,0.35), 0 0 60px -20px rgba(5,172,255,0.5)",
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(5,172,255,0.25), transparent 70%)",
            }}
          />
          <span className="relative">START PROJECT</span>
          <span className="relative transition-transform duration-300 group-hover:translate-x-1">→</span>
        </a>

        <p className="intro-xyz mt-6 font-mono text-[17px] uppercase tracking-[0.55em] text-primary/80">
          {t("intro.xyz")}
        </p>
      </div>

      {/* Vignette */}
      <div
        className="vignette absolute inset-0 opacity-0 pointer-events-none z-[15]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Scroll indicator */}
      <div className="scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 opacity-0">
        <span className="font-mono text-[14px] uppercase tracking-[0.4em] text-muted-foreground">
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
