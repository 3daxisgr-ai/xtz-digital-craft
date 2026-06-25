import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/xtz/ServicePage";
import { buildServiceHead } from "@/lib/seo/service-head";

const FAQ = [
  {
    q: "How fast can you produce a working prototype?",
    a: "Most prototypes are delivered in 3 to 7 working days from the moment we receive a clean CAD file. Simple 3D-printed proofs can ship next-day; CNC and sheet-metal prototypes depend on geometry and finishing.",
  },
  {
    q: "What's the difference between rapid prototyping and 3D printing?",
    a: "3D printing is one tool inside our rapid-prototyping toolkit. Depending on the part, we may also use CNC machining, fiber laser cutting and bending, or a combination — whichever gets you a usable, representative part fastest.",
  },
  {
    q: "Can a prototype be used as a final production part?",
    a: "Yes, when the geometry, material and tolerances allow. We design every prototype with the production version in mind, so the same CAD and process can scale into a small batch when you're ready.",
  },
  {
    q: "Do you sign NDAs before reviewing files?",
    a: "Yes — send an NDA with your enquiry and we'll countersign before opening any CAD files. We work with confidential R&D projects routinely.",
  },
  {
    q: "Which industries do you typically prototype for?",
    a: "Industrial equipment, automotive, robotics, consumer electronics, medical and architecture / product design. If your idea exists as a sketch or CAD model, we can usually prototype it.",
  },
];

export const Route = createFileRoute("/rapid-prototyping")({
  head: () =>
    buildServiceHead({
      title: "Rapid Prototyping Services in Greece — 3 to 7 Days | TOREO",
      description:
        "Industrial rapid prototyping in Thessaloniki: CAD review, 3D printing, CNC machining and sheet metal under one roof. Working prototypes in 3–7 days, EU-wide.",
      path: "/rapid-prototyping",
      altPath: "/gr/rapid-prototyping",
      locale: "en",
      serviceName: "Rapid Prototyping Services",
      serviceDescription:
        "Fast, engineering-led rapid prototyping combining 3D printing, CNC machining and sheet metal for industrial clients.",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      locale="en"
      kicker="Rapid Prototyping"
      h1="Industrial Rapid Prototyping Services — From CAD to Working Part in Days"
      heroSub="3D printing, CNC machining and sheet metal under one roof in Thessaloniki. We turn your idea into a real, testable prototype in 3 to 7 working days."
      ctaLabel="Request a Quote"
      ctaTo="/start"
      introTitle="Validate, iterate, and ship faster"
      introBody={[
        "Rapid prototyping closes the gap between a CAD model and a part you can hold, test and put in front of a customer. Picking the right process — print, mill, cut, fold or weld — is half the work, and that's where our engineering team starts every project.",
        "We've prototyped everything from consumer electronics housings to robotic end-effectors and architectural hardware. The output isn't a generic 3D print: it's a representative part that behaves like the production version.",
      ]}
      industriesTitle="Who we prototype for"
      industries={[
        { title: "Product startups", body: "Functional MVPs for investor demos, user testing and certification rigs." },
        { title: "Industrial R&D", body: "In-house engineers needing fast iterations on jigs, fixtures and tooling." },
        { title: "Robotics & automation", body: "Custom mounts, brackets and end-effectors for one-off and small-series builds." },
        { title: "Architecture & design", body: "Scale models, bespoke hardware and unique structural details." },
        { title: "Automotive & motorsport", body: "Aftermarket parts, brackets and validation prototypes." },
        { title: "Medical & lab equipment", body: "Housings, jigs and instrument prototypes in safe, cleanable materials." },
      ]}
      processTitle="Our rapid-prototyping workflow"
      process={[
        { step: "Step 01", title: "Send sketch or CAD", body: "Upload anything from a napkin sketch to a full STEP assembly." },
        { step: "Step 02", title: "Process selection", body: "We pick the fastest process that meets your function and tolerance needs." },
        { step: "Step 03", title: "Prototype produced", body: "3D print, CNC, laser-cut or sheet-formed in our own workshop." },
        { step: "Step 04", title: "Iterate to production", body: "Once validated, we scale the same files into a production batch." },
      ]}
      materialsTitle="Processes & materials"
      materials={[
        { label: "FDM 3D printing", value: "PLA, ABS, PETG, PC, TPU, carbon-filled" },
        { label: "Resin printing", value: "Tough, clear and engineering resins" },
        { label: "CNC machining", value: "Aluminium, steel, stainless, plastics" },
        { label: "Sheet metal", value: "Laser cut, bent and welded up to 12 mm" },
        { label: "Finishing", value: "Sanded, painted, anodised, powder-coated" },
        { label: "Typical lead time", value: "3–7 working days" },
      ]}
      whyTitle="Why teams choose TOREO for prototyping"
      why={[
        { title: "Right process, first time", body: "We pick the manufacturing route that fits your part — not the one we want to upsell." },
        { title: "DFM included", body: "Every quote includes design-for-manufacture notes so the next revision is cheaper and faster." },
        { title: "One supplier", body: "3D printing, machining, sheet metal and finishing under one roof — one quote, one delivery." },
        { title: "Production-ready", body: "Prototypes designed with scale-up in mind, so you don't restart at production." },
      ]}
      faqTitle="Frequently asked questions"
      faq={FAQ}
      finalTitle="From idea to prototype in days, not months."
      finalBody="Upload your CAD or sketch and we'll come back with a binding quote, lead time and process recommendation."
    />
  );
}
