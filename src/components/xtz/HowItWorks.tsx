import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Lightbulb,
  MessagesSquare,
  PenTool,
  FlaskConical,
  Factory,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

type Step = {
  n: string;
  tKey: string;
  dKey: string;
  Icon: LucideIcon;
};

const steps: Step[] = [
  { n: "01", tKey: "how.s1.t", dKey: "how.s1.d", Icon: Lightbulb },
  { n: "02", tKey: "how.s2.t", dKey: "how.s2.d", Icon: MessagesSquare },
  { n: "03", tKey: "how.s3.t", dKey: "how.s3.d", Icon: PenTool },
  { n: "04", tKey: "how.s4.t", dKey: "how.s4.d", Icon: FlaskConical },
  { n: "05", tKey: "how.s5.t", dKey: "how.s5.d", Icon: Factory },
  { n: "06", tKey: "how.s6.t", dKey: "how.s6.d", Icon: Truck },
];

export function HowItWorks() {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hw-card", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".hw-head > *", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={root}
      className="relative w-full overflow-hidden inox-surface py-28 md:py-40"
      style={{ backgroundColor: "#131c33" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.55 0.2 245 / 0.32), transparent 60%)",
        }}
      />
      {/* Section blends */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(180deg, #131c33 0%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{ background: "linear-gradient(180deg, transparent 0%, #0c1426 100%)" }}
      />
      <span className="absolute top-8 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        {t("how.tag")}
      </span>
      <span className="absolute top-8 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="hw-head mb-16 md:mb-24 max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">02 /</span>
            <span className="h-px w-20 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("how.kicker")}
            </span>
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5.5rem)] tracking-tighter">
            {t("how.title")}
          </h2>
        </div>

        <ol className="grid gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ n, tKey, dKey, Icon }) => (
            <li
              key={n}
              className="hw-card group relative flex flex-col p-7 md:p-8 border border-primary/15 hover:border-primary/50 transition-colors"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.18 0.02 245 / 0.55), oklch(0.10 0.01 245 / 0.32))",
              }}
            >
              <div className="flex items-start justify-between mb-10">
                <div className="grid h-12 w-12 place-items-center border border-primary/40 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight mb-3">
                {t(tKey)}
              </h3>
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
                {t(dKey)}
              </p>
              <span className="mt-8 h-px w-full bg-gradient-to-r from-primary/40 to-transparent" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
