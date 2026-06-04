import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { capabilities } from "@/components/xtz/Capabilities";
import { useI18n } from "@/components/xtz/i18n";

export const Route = createFileRoute("/capabilities/")({
  head: () => ({
    meta: [
      { title: "Capabilities — 3D AXIS" },
      { name: "description", content: "Design, fiber laser cutting, sheet metal, 3D printing, prototyping and global manufacturing." },
      { property: "og:title", content: "Capabilities — 3D AXIS" },
      { property: "og:description", content: "Six core capabilities, end to end." },
    ],
  }),
  component: CapabilitiesIndex,
});

function CapabilitiesIndex() {
  const { t } = useI18n();
  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative pt-40 pb-24 px-6 md:px-12">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
            <span className="h-px w-16 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("cap.kicker")}
            </span>
          </div>
          <h1
            className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5.5rem)] tracking-tighter mb-6 max-w-4xl"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            {t("cap.title")}
          </h1>
          <p className="text-foreground/65 max-w-xl mb-14">{t("cap.body")}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((c) => (
              <Link
                key={c.slug}
                to="/capabilities/$slug"
                params={{ slug: c.slug }}
                className="group relative p-8 border border-border/60 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden transition-colors hover:border-primary/60 block"
              >
                <div aria-hidden className="absolute -top-px left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full blue-glow" />
                <div className="relative flex flex-col min-h-[180px]">
                  <div className="font-mono text-[10px] tracking-[0.4em] text-primary/80 mb-5">{c.n}</div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight mb-3 group-hover:text-primary transition-colors">
                    {t(c.tKey)}
                  </h3>
                  <p className="text-sm text-foreground/65 leading-relaxed">{t(c.dKey)}</p>
                  <span className="mt-auto pt-6 font-mono text-[10px] tracking-[0.3em] text-primary opacity-70 group-hover:opacity-100">
                    {t("cap.cta")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
