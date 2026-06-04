import { useI18n } from "./i18n";

export function Finale() {
  const { t } = useI18n();
  return (
    <section id="finale" className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-black">
      <div className="absolute inset-0">
        <div className="absolute inset-0 brushed-metal opacity-30" />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.4 0.2 245 / 0.5), transparent 65%)" }} />
        <div className="absolute bottom-0 inset-x-0 h-1/2"
          style={{ background: "linear-gradient(to top, oklch(0.55 0.22 245 / 0.3), transparent)" }} />
      </div>

      <span className="absolute top-10 left-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">X · 0000</span>
      <span className="absolute top-10 right-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">Y · 0000</span>
      <span className="absolute bottom-10 left-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">Z · 0000</span>

      <div className="relative z-10 text-center px-6 max-w-5xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-10 animate-pulse-glow">
          {t("finale.kicker")}
        </div>
        <h2 className="font-display font-bold leading-[0.85] text-[clamp(2.6rem,10vw,11rem)] tracking-tighter text-glow">
          3D AXIS
        </h2>
        <p className="mt-8 font-mono text-xs md:text-sm uppercase tracking-[0.6em] text-primary">
          {t("intro.slogan")}
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          X · Y · Z
        </p>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-display text-2xl md:text-4xl font-light">
          <span>Design.</span>
          <span className="text-primary">Prototype.</span>
          <span>Manufacture.</span>
          <span className="text-primary">Deliver.</span>
        </div>

        <p className="mt-16 text-xl md:text-3xl font-display font-light text-foreground/90 max-w-3xl mx-auto leading-tight">
          {t("finale.statement")}
        </p>

        <div className="mt-14 flex justify-center">
          <a
            href="#inquiry"
            className="group relative inline-flex items-center gap-4 px-10 py-5 border border-primary bg-primary/10 backdrop-blur-sm blue-glow hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <span className="font-mono text-sm uppercase tracking-[0.4em]">{t("finale.cta")}</span>
            <span className="text-lg group-hover:translate-x-2 transition-transform">→</span>
          </a>
        </div>

        <div className="mt-28 flex flex-wrap justify-center gap-x-10 gap-y-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>{t("finale.foot1")}</span>
          <span>+ {t("finale.foot2")}</span>
          <span>+ {t("finale.foot3")}</span>
        </div>
      </div>
    </section>
  );
}
