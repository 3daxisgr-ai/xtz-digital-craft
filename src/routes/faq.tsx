import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { FAQ } from "@/components/xtz/FAQ";
import { useI18n } from "@/components/xtz/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — 3D AXIS" },
      { name: "description", content: "Answers about 3D printing, laser cutting, materials, lead times, prototyping, production, pricing and file requirements." },
      { property: "og:title", content: "FAQ — 3D AXIS" },
      { property: "og:description", content: "Everything you need to know before starting a project with 3D AXIS." },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/faq" },
    ],
    links: [
      { rel: "canonical", href: "https://xtz-digital-craft.lovable.app/faq" },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  const { t, lang } = useI18n();
  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative pt-40 pb-12 px-6 md:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {t("nav.faq")}
          </div>
          <h1
            className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5rem)] tracking-tighter mb-6"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            {lang === "GR" ? "Συχνές Ερωτήσεις" : "Frequently Asked Questions"}
          </h1>
          <p className="text-foreground/65 max-w-xl mx-auto">
            {lang === "GR"
              ? "Όλα όσα χρειάζεστε πριν ξεκινήσετε ένα έργο."
              : "Everything you need to know before starting a project."}
          </p>
        </div>
      </section>
      <FAQ />
      <Footer />
    </main>
  );
}
