import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroOffice from "@/assets/hero-office.jpg";

gsap.registerPlugin(ScrollTrigger);

export function Concept() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cn-img", {
        scale: 1.15,
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.from(".cn-reveal > *", {
        y: 50, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".cn-rule", {
        scaleX: 0, transformOrigin: "left", duration: 1.4, ease: "power2.inOut",
        scrollTrigger: { trigger: root.current, start: "top 60%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="concept"
      ref={root}
      className="relative min-h-screen w-full overflow-hidden bg-black flex items-center"
    >
      <div className="absolute inset-0">
        <img
          src={heroOffice}
          alt="3D AXIS engineering studio — illuminated wall sign, CAD workstation and metal prototypes"
          loading="lazy"
          width={1920}
          height={1080}
          className="cn-img h-full w-full object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 15% 50%, oklch(0.5 0.2 245 / 0.35), transparent 55%)" }}
        />
      </div>

      <span className="absolute top-10 left-6 md:left-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        — / WHY 3D AXIS
      </span>
      <span className="absolute top-10 right-6 md:right-12 z-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 md:px-12">
        <div className="cn-reveal max-w-2xl space-y-8">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
            <span className="cn-rule h-px w-24 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              From Concept to Reality
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,7vw,6rem)] tracking-tighter">
            From Concept<br />to Reality.
          </h2>
          <p className="text-lg md:text-xl text-foreground/75 leading-relaxed font-light max-w-xl">
            We transform ideas into manufacturable solutions.
          </p>
          <p className="text-base text-foreground/60 leading-relaxed max-w-xl">
            From concept development and engineering design to prototyping, fabrication and
            production support, 3D AXIS helps bring projects into the real world.
          </p>
          <div className="pt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.4em] text-primary/80">
            <span>Design.</span>
            <span>Prototype.</span>
            <span>Manufacture.</span>
            <span>Deliver.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
