import { useI18n } from "./i18n";
import { Link } from "@tanstack/react-router";

export function Finale() {
  const { t } = useI18n();
  return (
    <section id="finale" className="relative w-full overflow-hidden flex items-center justify-center bg-black py-32 md:py-44">
      <div className="absolute inset-0">
        <div className="absolute inset-0 brushed-metal opacity-20" />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.4 0.2 245 / 0.4), transparent 65%)" }} />
      </div>

      <span className="absolute top-10 left-10 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>
      <span className="absolute top-10 right-10 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>

      <div className="relative z-10 text-center px-6 max-w-4xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-8">
          {t("finale.kicker")}
        </div>
        <h2
          className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,7vw,5.5rem)] tracking-tighter"
          style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.4)" }}
        >
          {t("finale.statement")}
        </h2>

        <div className="mt-12 flex justify-center">
          <Link
            to="/"
            hash="inquiry"
            className="group relative inline-flex items-center gap-4 px-10 py-5 border border-primary bg-primary/10 backdrop-blur-sm blue-glow hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <span className="font-mono text-sm uppercase tracking-[0.4em]">{t("finale.cta")}</span>
            <span className="text-lg group-hover:translate-x-2 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
