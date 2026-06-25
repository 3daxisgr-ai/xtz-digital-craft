import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/xtz/ServicePage";
import { buildServiceHead } from "@/lib/seo/service-head";

const FAQ = [
  {
    q: "What kind of custom metal parts does TOREO make?",
    a: "Brackets, enclosures, frames, plates, mounts, hardware, jigs, fixtures and bespoke assemblies — anything that can be cut, bent, machined or welded from sheet metal, plate, tube or billet.",
  },
  {
    q: "Which metals do you work with?",
    a: "Structural steel (S235 / S275 / S355), stainless (304 / 316), aluminium (5083 / 6061 / 6082) and engineering plastics. We hold most common gauges in stock for sheet metal jobs.",
  },
  {
    q: "Can you handle small-batch production?",
    a: "Yes. Most clients start with a prototype and follow up with batches of 5 to 500 parts. Larger runs are quoted on request through our global manufacturing network.",
  },
  {
    q: "Do you offer surface finishing?",
    a: "Yes — brushing, powder-coating in any RAL colour, anodising for aluminium, and electro-polishing for stainless. Finishing is quoted as part of the part, not a separate logistics step.",
  },
  {
    q: "How do I get pricing for a custom metal part?",
    a: "Send your CAD file (STEP, IGES, DWG, DXF) through our quote form. We'll reply within 24 hours with a binding price, lead time and any engineering notes.",
  },
];

export const Route = createFileRoute("/custom-metal-parts")({
  head: () =>
    buildServiceHead({
      title: "Custom Metal Parts Manufacturing in Greece & Europe | TOREO",
      description:
        "Custom metal parts manufacturing in Thessaloniki: laser cutting, CNC machining, bending, welding and finishing. Steel, stainless, aluminium — prototypes to batches, EU-wide.",
      path: "/custom-metal-parts",
      altPath: "/gr/custom-metal-parts",
      locale: "en",
      serviceName: "Custom Metal Parts Manufacturing",
      serviceDescription:
        "End-to-end manufacturing of custom metal parts in steel, stainless and aluminium for industrial clients across Europe.",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      locale="en"
      kicker="Custom Metal Parts"
      h1="Custom Metal Parts Manufacturing — Steel, Stainless & Aluminium"
      heroSub="Fiber laser cutting, CNC machining, bending, welding and finishing under one roof. Prototypes and small-batch production for industrial clients across Greece and Europe."
      ctaLabel="Request a Quote"
      ctaTo="/start"
      introTitle="One workshop, every metal-fabrication step"
      introBody={[
        "Custom metal parts usually need more than one process. A bracket might be laser-cut, bent, welded, then powder-coated. A housing might be machined and then assembled. Splitting that work across three suppliers means three quotes, three lead times and three chances for something to go wrong.",
        "TOREO does all of it in one Thessaloniki workshop. Cutting, machining, bending, welding, finishing and assembly are handled by our own team, on our own equipment, against one purchase order.",
      ]}
      industriesTitle="What we manufacture"
      industries={[
        { title: "Brackets & mounts", body: "Structural brackets, motor mounts, fixing plates and equipment supports." },
        { title: "Enclosures & housings", body: "IP-rated cabinets, control boxes and instrument housings." },
        { title: "Frames & structures", body: "Welded frames, trolleys, jigs and machine bases." },
        { title: "Hardware & fittings", body: "Bespoke fasteners, connectors and architectural hardware." },
        { title: "Production tooling", body: "Jigs, fixtures and quick-change tooling for production lines." },
        { title: "Aftermarket & spare parts", body: "Replacement metal parts when the OEM no longer supplies them." },
      ]}
      processTitle="How a custom metal part gets made"
      process={[
        { step: "Step 01", title: "Quote from CAD", body: "Upload a STEP, DWG or DXF. We respond within 24 hours with binding pricing." },
        { step: "Step 02", title: "Material & finish", body: "Confirm grade, gauge and finish — we hold common stock to start fast." },
        { step: "Step 03", title: "Fabrication", body: "Cutting, bending, machining and welding by our in-house team." },
        { step: "Step 04", title: "Finish & deliver", body: "Powder-coat, anodising or polish, QC check, then EU-wide dispatch." },
      ]}
      materialsTitle="Materials & finishes"
      materials={[
        { label: "Carbon steel", value: "S235, S275, S355 — 0.5 to 20 mm sheet & plate" },
        { label: "Stainless", value: "304, 316 — sheet, tube and machined parts" },
        { label: "Aluminium", value: "5083, 6061, 6082 — sheet, extrusion, billet" },
        { label: "Cutting", value: "Fiber laser up to 12 mm steel, shear for plate" },
        { label: "Forming", value: "Press-brake bending, rolling, MIG / TIG welding" },
        { label: "Finishing", value: "RAL powder-coat, anodising, brushing, polishing" },
      ]}
      whyTitle="Why TOREO for custom metal manufacturing"
      why={[
        { title: "One supplier", body: "Cut, machined, bent, welded, finished and shipped from one PO." },
        { title: "Industrial reliability", body: "Mechanical engineers on staff, calibrated machines, consistent QC." },
        { title: "Honest lead times", body: "We commit to dates and ship on them — no rolling promises." },
        { title: "EU coverage", body: "Tracked delivery across the EU with full documentation." },
      ]}
      faqTitle="Frequently asked questions"
      faq={FAQ}
      finalTitle="Need a custom metal part? Send your file."
      finalBody="STEP, DWG or DXF — we'll come back within 24 hours with a binding price, lead time and any DFM notes."
    />
  );
}
