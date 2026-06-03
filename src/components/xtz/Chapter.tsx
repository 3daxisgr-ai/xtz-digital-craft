import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ChapterProps {
  id: string;
  number: string;
  kicker: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  align?: "left" | "right";
  children?: ReactNode;
}

export function Chapter({
  id, number, kicker, title, description, image, imageAlt, align = "left", children,
}: ChapterProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ch-img", {
        scale: 1.25,
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.from(".ch-content > *", {
        y: 60, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".ch-laser", {
        scaleX: 0, transformOrigin: "left", duration: 1.4, ease: "power2.inOut",
        scrollTrigger: { trigger: root.current, start: "top 60%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id={id}
      ref={root}
      className="relative min-h-screen w-full overflow-hidden flex items-center"
    >
      <div className="absolute inset-0">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          width={1920}
          height={1080}
          className="ch-img h-full w-full object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      <div
        className={`relative z-10 mx-auto w-full max-w-[1600px] px-6 md:px-12 grid md:grid-cols-12 gap-8 ${
          align === "right" ? "md:[&>div]:col-start-7" : ""
        }`}
      >
        <div className="ch-content md:col-span-6 space-y-8">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">{number}</span>
            <span className="ch-laser h-px w-24 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {kicker}
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,7vw,6.5rem)] tracking-tighter">
            {title}
          </h2>
          <p className="max-w-md text-lg text-foreground/70 leading-relaxed">{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
