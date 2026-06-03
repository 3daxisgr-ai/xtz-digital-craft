import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroOffice from "@/assets/hero-office.jpg";

gsap.registerPlugin(ScrollTrigger);

export function IntroScene() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#intro",
          start: "top top",
          end: "+=200%",
          scrub: 1.2,
          pin: true,
        },
      });

      tl.to(".scene-img", { scale: 4.2, ease: "power2.inOut" }, 0)
        .to(".scene-img", { filter: "brightness(1.3) saturate(1.2)" }, 0)
        .to(".intro-headline", { opacity: 0, y: -40, ease: "power2.in" }, 0)
        .to(".scroll-hint", { opacity: 0 }, 0)
        .to(".blue-wash", { opacity: 1 }, 0.2)
        .to(".sparks", { opacity: 1 }, 0.5)
        .to(".scene-img", { opacity: 0.15 }, 0.85)
        .to(".portal", { opacity: 1, scale: 1, ease: "power3.out" }, 0.7);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="intro"
      ref={root}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <div className="scene-img absolute inset-0 will-change-transform">
        <img
          src={heroOffice}
          alt="XTZ industrial studio: ultrawide monitor on brushed metal desk with blue ambient lighting"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
      </div>

      <div className="blue-wash absolute inset-0 opacity-0 pointer-events-none mix-blend-screen"
        style={{ background: "var(--gradient-blue-glow)" }} />

      <div className="sparks absolute inset-0 opacity-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary blue-glow"
            style={{
              left: `${30 + Math.random() * 40}%`,
              top: `${40 + Math.random() * 30}%`,
              animation: `pulse-glow ${1 + Math.random() * 2}s ${Math.random()}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="intro-headline absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6 animate-pulse-glow">
          XTZ · EST. 2014
        </div>
        <h1 className="font-display font-bold leading-[0.85] text-[clamp(4rem,16vw,18rem)] tracking-tighter text-glow">
          XTZ
        </h1>
        <p className="mt-6 max-w-xl text-lg md:text-2xl font-light text-foreground/80">
          Precision Beyond Limits
        </p>
      </div>

      <div className="scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Scroll to enter
        </span>
        <span className="block h-12 w-px bg-gradient-to-b from-primary to-transparent animate-pulse-glow" />
      </div>

      <div
        className="portal absolute inset-0 z-20 opacity-0 scale-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.18 245 / 0.4), oklch(0.05 0.005 240) 70%)",
        }}
      />
    </section>
  );
}
