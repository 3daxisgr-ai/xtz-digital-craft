import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/xtz/ServicePage";
import { buildServiceHead } from "@/lib/seo/service-head";

const FAQ = [
  {
    q: "What kind of custom metal parts does TOREO make?",
    a: "Brackets, enclosures, frames, plates, mounts, hardware, jigs, fixtures and bespoke assemblies — anything that can be laser-cut, bent or welded from sheet metal.",
  },
  {
    q: "Which metals do you work with?",
    a: "Structural steel (S235 / S275 / S355), stainless (304 / 316), aluminium (5083 / 6061 / 6082) and engineering plastics. We hold most common gauges in stock for sheet metal jobs.",
  },
  {
    q: "Can you handle small-batch production?",
    a: "Yes. Most clients start with a prototype and follow up with small batches. Larger runs are quoted on request and may be produced in-house or through our trusted network of production partners, depending on the project.",
  },
  {
    q: "Do you offer surface finishing?",
    a: "Additional finishing options — such as powder-coating, anodising or electro-polishing — may be available through selected production partners. Availability depends on the specific project; please describe the finish you need and we will confirm.",
  },
  {
    q: "How do I get pricing for a custom metal part?",
    a: "Send your CAD file (STEP, IGES, DWG, DXF) through our quote form. Project requirements are reviewed by an engineer before quotation.",
  },
];

export const Route = createFileRoute("/custom-metal-parts")({
  head: () =>
    buildServiceHead({
      title: "Custom Metal Parts — Laser Cutting, Bending & Welding | TOREO",
      description:
        "Custom metal parts in Thessaloniki: fiber laser cutting, press-brake bending and MIG/TIG welding. Steel, stainless, aluminium — project requirements reviewed before quotation.",
      path: "/custom-metal-parts",
      altPath: "/gr/custom-metal-parts",
      locale: "en",
      serviceName: "Custom Metal Parts",
      serviceDescription:
        "In-house fiber laser cutting, press-brake bending and MIG/TIG welding of custom metal parts in steel, stainless and aluminium.",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      locale="en"
      kicker="Custom Metal Parts"
      h1="Custom Metal Parts — Steel, Stainless & Aluminium"
      heroSub="Fiber laser cutting, press-brake bending and MIG/TIG welding in our Thessaloniki workshop. Prototypes and small-batch production for industrial clients."
      ctaLabel="Upload CAD & Request a Quote"
      ctaTo="/start-project"
      introTitle="Laser cutting, bending and welding — in-house"
      introBody={[
        "Custom metal parts usually need more than one process. A bracket might be laser-cut, bent and then welded. A housing might be cut, folded and assembled. Splitting that work across three suppliers means three quotes, three lead times and three chances for something to go wrong.",
        "TOREO handles fiber laser cutting, press-brake bending, MIG and TIG welding directly in our Thessaloniki workshop. Additional finishing options may be available through selected production partners depending on the project.",
      ]}
      industriesTitle="What we manufacture"
      industries={[
        { title: "Brackets & mounts", body: "Structural brackets, fixing plates and equipment supports." },
        { title: "Enclosures & housings", body: "Cabinets, control boxes and instrument housings." },
        { title: "Frames & structures", body: "Welded frames, trolleys, jigs and machine bases." },
        { title: "Hardware & fittings", body: "Bespoke connectors and architectural hardware." },
        { title: "Production tooling", body: "Jigs and fixtures for production lines." },
        { title: "Aftermarket & spare parts", body: "Replacement metal parts when the OEM no longer supplies them." },
      ]}
      processTitle="How a custom metal part gets made"
      process={[
        { step: "Step 01", title: "Quote from CAD", body: "Upload a STEP, DWG or DXF. Project requirements are reviewed before quotation." },
        { step: "Step 02", title: "Material & finish", body: "Confirm grade, gauge and finishing needs." },
        { step: "Step 03", title: "Fabrication", body: "Cutting, bending and welding by our in-house team." },
        { step: "Step 04", title: "Finish & deliver", body: "Additional finishing evaluated per project; QC check, then EU-wide dispatch." },
      ]}
      materialsTitle="Materials & capabilities"
      materials={[
        { label: "Carbon steel", value: "Common structural grades — sheet & plate" },
        { label: "Stainless", value: "304, 316 — sheet and formed parts" },
        { label: "Aluminium", value: "Common grades — sheet" },
        { label: "Cutting", value: "Fiber laser up to 12 mm steel" },
        { label: "Forming", value: "Press-brake bending, MIG / TIG welding" },
        { label: "Finishing", value: "Additional finishing options may be available through selected production partners" },
      ]}
      whyTitle="Why TOREO for custom metal parts"
      why={[
        { title: "In-house fabrication", body: "Cutting, bending and welding on our own equipment." },
        { title: "Engineer reviewed", body: "Every inquiry is reviewed by an engineer before quotation." },
        { title: "Honest lead times", body: "Lead time depends on material, quantity and complexity — we commit to dates we can hit." },
        { title: "EU coverage", body: "Tracked delivery across the EU with documentation." },
      ]}
      faqTitle="Frequently asked questions"
      faq={FAQ}
      finalTitle="Need a custom metal part? Send your file."
      finalBody="STEP, DWG or DXF — project requirements are reviewed by an engineer before quotation."
    />
  );
}

