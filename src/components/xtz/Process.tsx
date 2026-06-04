import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

const stepKeys = [
  { n: "01", t: "p.idea.t", d: "p.idea.d" },
  { n: "02", t: "p.design.t", d: "p.design.d" },
  { n: "03", t: "p.proto.t", d: "p.proto.d" },
  { n: "04", t: "p.mfg.t", d: "p.mfg.d" },
  { n: "05", t: "p.deliver.t", d: "p.deliver.d" },
];

export function Process() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".pr-step", {
        opacity: 0, y: 80, stagger: 0.15, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".pr-line", {
        scaleY: 0, transformOrigin: "top", duration: 1.6, ease: "power2.inOut",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" ref={root} className="relative min-h-screen w-full bg-black py-32 overflow-hidden">
      <div className="absolute inset-0 opacity-30"
        style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.15 245 / 0.4), transparent 60%)" }} />
      <span className="absolute top-6 right-6 md:top-10 md:right-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">X · Y · Z</span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-12">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">06 /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("process.kicker")}</span>
        </div>
        <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,7vw,6rem)] tracking-tighter mb-24 max-w-4xl">
          {t("process.title")}
        </h2>

        <div className="relative">
          <div className="pr-line absolute left-6 md:left-12 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent blue-glow" />
          <ul className="space-y-16 md:space-y-24">
            {stepKeys.map((s) => (
              <li key={s.n} className="pr-step relative grid grid-cols-[60px_1fr] md:grid-cols-[120px_1fr_2fr] gap-6 md:gap-12 items-baseline">
                <span className="relative -ml-1 md:-ml-1">
                  <span className="absolute -left-[5px] top-2 h-3 w-3 rounded-full bg-primary blue-glow" />
                  <span className="block pl-8 md:pl-16 font-mono text-xs text-primary tracking-[0.3em]">{s.n}</span>
                </span>
                <h3 className="font-display font-bold text-2xl md:text-5xl tracking-tight">{t(s.t)}</h3>
                <p className="col-start-2 md:col-start-3 text-foreground/60 md:text-lg max-w-md">{t(s.d)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
