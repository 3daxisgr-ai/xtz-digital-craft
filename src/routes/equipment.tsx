import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { Equipment } from "@/components/xtz/Equipment";
import { useI18n } from "@/components/xtz/i18n";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "CNC Manufacturing Equipment & Technology | TOREO" },
      {
        name: "description",
        content:
          "Discover TOREO's manufacturing equipment for rapid prototyping, 3D printing services and CNC machining — Bambu Lab H2S printers, AKJ1530F fiber laser, press brakes and welding stations in Thessaloniki, Greece.",
      },
      { name: "keywords", content: "CNC manufacturing, 3D printing equipment, fiber laser cutting, rapid prototyping, sheet metal Thessaloniki, Greece" },
      { property: "og:title", content: "CNC Manufacturing Equipment & Technology | TOREO" },
      {
        property: "og:description",
        content:
          "Professional manufacturing equipment — 3D printing, fiber laser cutting, press brakes and welding — for prototype and custom parts manufacturing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/equipment" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CNC Manufacturing Equipment & Technology | TOREO" },
      { name: "twitter:description", content: "Professional equipment for 3D printing, fiber laser cutting and sheet metal manufacturing at TOREO." },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/equipment" },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const { lang } = useI18n();
  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative pt-40 pb-12 px-6 md:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {lang === "GR" ? "ΕΞΟΠΛΙΣΜΟΣ & ΤΕΧΝΟΛΟΓΙΑ" : "Equipment & Technology"}
          </div>
          <h1
            className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5rem)] tracking-tighter mb-6"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            {lang === "GR" ? "ΕΞΟΠΛΙΣΜΟΣ & ΤΕΧΝΟΛΟΓΙΑ" : "Equipment & Technology"}
          </h1>
          <p className="text-foreground/65 max-w-2xl mx-auto leading-relaxed">
            {lang === "GR"
              ? "Επαγγελματικός εξοπλισμός κατασκευής που μας βοηθά να μετατρέπουμε ιδέες σε ολοκληρωμένα προϊόντα με ακρίβεια, ταχύτητα και αξιοπιστία."
              : "Professional manufacturing equipment that helps us transform ideas into finished products with precision, speed and reliability."}
          </p>
        </div>
      </section>
      <Equipment />
      <Footer />
    </main>
  );
}
