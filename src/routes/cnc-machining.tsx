import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/xtz/ServicePage";
import { buildServiceHead } from "@/lib/seo/service-head";

const FAQ = [
  {
    q: "What CNC machining services does TOREO offer?",
    a: "We deliver precision CNC machining for prototypes, small batches and production runs across steel, stainless steel, aluminium and engineering plastics, plus fiber laser cutting, bending and welding under one roof in Thessaloniki, Greece.",
  },
  {
    q: "What tolerances can you achieve?",
    a: "Standard tolerances follow ISO 2768-m. Tighter tolerances down to ±0.02 mm on critical features are available on request — let us know in your quote and we will confirm based on geometry and material.",
  },
  {
    q: "How long does a typical CNC machining job take?",
    a: "Most rapid prototypes ship in 3–7 working days. Production batches depend on volume and finishing, but we will give you a binding lead time with your quote, usually within 24 hours of receiving your CAD file.",
  },
  {
    q: "Which file formats do you accept?",
    a: "STEP (.step / .stp), IGES, Parasolid, SolidWorks, Fusion 360, STL and 2D DWG / DXF for laser cutting. Send your file through our quote form — we'll review and reply with cost, lead time and any DFM notes.",
  },
  {
    q: "Do you ship CNC parts across Europe?",
    a: "Yes. We deliver to clients across Greece and the EU via tracked courier, with customs paperwork handled for non-EU destinations. Express options are available on request.",
  },
];

export const Route = createFileRoute("/cnc-machining")({
  head: () =>
    buildServiceHead({
      title: "CNC Machining Services in Greece & Europe | TOREO",
      description:
        "Precision CNC machining services in Thessaloniki, Greece. Custom metal parts, prototypes and production runs in steel, stainless, aluminium. Fast quotes — EU-wide delivery.",
      path: "/cnc-machining",
      altPath: "/gr/cnc-machining",
      locale: "en",
      serviceName: "CNC Machining Services",
      serviceDescription:
        "Precision CNC machining, fiber laser cutting, bending and welding for industrial clients across Greece and Europe.",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      locale="en"
      kicker="CNC Machining"
      h1="Precision CNC Machining for Industrial Clients in Greece & Europe"
      heroSub="From a single prototype to production runs — engineered, machined and finished in our Thessaloniki workshop. Send your CAD file and get a quote in under 24 hours."
      ctaLabel="Request a Quote"
      ctaTo="/start"
      introTitle="Custom CNC parts, engineered to spec"
      introBody={[
        "CNC machining turns your digital model into a real, functional metal part with micron-level repeatability. Whether you need one prototype to validate a design, or a recurring production batch with full documentation, TOREO handles the full workflow under one roof — engineering review, machining, finishing and QC.",
        "We work with engineers, product designers and industrial clients who care about tolerances, surface finish and on-time delivery. No middlemen, no offshore handoffs — every part is made in Thessaloniki by our own team on calibrated machines.",
      ]}
      industriesTitle="Industries we serve"
      industries={[
        { title: "Automotive & Motorsport", body: "Brackets, mounts, jigs and aftermarket parts machined to OEM tolerances." },
        { title: "Industrial Automation", body: "Custom housings, plates and fixtures for production-line equipment." },
        { title: "Energy & Renewables", body: "Stainless and aluminium components for solar, wind and grid infrastructure." },
        { title: "Robotics & R&D", body: "Lightweight aluminium structural parts, sensor mounts and end-effectors." },
        { title: "Medical & Lab", body: "Cleanly finished stainless and engineering plastic parts for instruments and rigs." },
        { title: "Architecture & Design", body: "Bespoke metal hardware, signage components and structural details." },
      ]}
      processTitle="From CAD to finished part"
      process={[
        { step: "Step 01", title: "Upload your CAD", body: "Send STEP, IGES, SolidWorks or DWG via our quote form. NDA on request." },
        { step: "Step 02", title: "Engineering review", body: "We review geometry, suggest DFM improvements and confirm tolerances." },
        { step: "Step 03", title: "Quote in 24h", body: "Binding price and lead time, with material and finish options spelled out." },
        { step: "Step 04", title: "Machine & QC", body: "Production on calibrated CNC and fiber laser equipment, dimensional QC before dispatch." },
      ]}
      materialsTitle="Materials & capabilities"
      materials={[
        { label: "Steel", value: "S235, S275, S355 — structural and machined parts" },
        { label: "Stainless", value: "304 / 316 — corrosion-resistant components" },
        { label: "Aluminium", value: "5083, 6061, 6082 — lightweight precision parts" },
        { label: "Engineering plastics", value: "POM, PA, PC, PEEK on request" },
        { label: "Tolerances", value: "ISO 2768-m standard, ±0.02 mm on request" },
        { label: "Finishing", value: "Brushed, powder-coat, anodised, electro-polished" },
      ]}
      whyTitle="Why TOREO for CNC machining"
      why={[
        { title: "Engineering-led", body: "Mechanical engineers review every file before quoting — fewer surprises, better parts." },
        { title: "Fast turnaround", body: "Quotes in 24 hours, prototypes in days, batches scheduled with hard dates." },
        { title: "Single workshop", body: "Cutting, machining, bending, welding and finishing in one facility — no logistics gaps." },
        { title: "EU-wide delivery", body: "Tracked shipping across Greece, the Balkans and the EU, with documentation included." },
      ]}
      faqTitle="Frequently asked questions"
      faq={FAQ}
      finalTitle="Send your CAD file. Get a quote in 24 hours."
      finalBody="No commitment, no obligation — just a fast, honest answer on price and lead time from a real engineer."
    />
  );
}
