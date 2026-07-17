import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { FAQ } from "@/components/xtz/FAQ";
import { useI18n } from "@/components/xtz/i18n";

const FAQ_QA: { q: string; a: string }[] = [
  { q: "Is 3D printing only for prototypes?", a: "No. We print prototypes, functional end-use parts, custom components, and small to medium production runs." },
  { q: "Which file types do you accept for 3D printing?", a: ".stl, .step (.stp), or .obj. Include quantity and any surface finish requirements." },
  { q: "How big can you print?", a: "Most parts fit our build volumes; larger parts are split and bonded. Send dimensions and we'll confirm." },
  { q: "What tolerances do you hold for laser cutting?", a: "Typical fiber-laser tolerance is ±0.05 mm depending on material and thickness. Tighter tolerances are evaluated individually per project." },
  { q: "Which file types do you accept for laser cutting?", a: ".dxf, .dwg, or .step. Specify material, thickness and quantity." },
  { q: "Which metals do you cut?", a: "Mild steel, stainless steel, aluminum, brass. Copper on request." },
  { q: "Which polymers do you print?", a: "PLA, ABS, PETG, Nylon (PA), PC, plus TPU. Additional materials evaluated per project." },
  { q: "How fast can you create a prototype?", a: "Most 3D-printed prototypes ship within a few days. Lead time depends on material, quantity and complexity." },
  { q: "How fast is production?", a: "Lead time depends on material, quantity and complexity. We provide a clear timeline with every quote." },
  { q: "Do I need a finished design first?", a: "No. We can start from a sketch or idea and develop it into a manufacturable design." },
  { q: "Do you offer finishing such as powder coating or anodising?", a: "Additional finishing options may be available through selected production partners. Availability depends on the specific project — please describe the finish you need and we will confirm." },
  { q: "Can you do large volumes?", a: "For larger series, production can be handled either in-house or through trusted partners in our network, depending on the project." },
  { q: "How do I get a quote?", a: "Send the inquiry form. An engineer reviews every request and replies within one business day." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — 3D Printing, Laser Cutting & Prototyping Questions | TOREO" },
      { name: "description", content: "Answers about 3D printing, fiber laser cutting, sheet metal bending, welding, materials, tolerances, lead times and file requirements at TOREO." },
      { property: "og:title", content: "FAQ — 3D Printing, Laser Cutting & Prototyping | TOREO" },
      { property: "og:description", content: "Everything you need to know about TOREO's 3D printing, laser cutting, sheet metal fabrication and prototyping." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/faq" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FAQ — TOREO Manufacturing" },
      { name: "twitter:description", content: "3D printing, fiber laser cutting and sheet metal FAQs from TOREO." },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/faq" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_QA.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
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
