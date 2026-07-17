import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/xtz/ServicePage";
import { buildServiceHead } from "@/lib/seo/service-head";

const FAQ = [
  {
    q: "How fast can you produce a working prototype?",
    a: "Lead time depends on material, quantity and complexity — most 3D-printed prototypes ship within a few days. Sheet-metal prototypes are evaluated individually per project.",
  },
  {
    q: "What's the difference between rapid prototyping and 3D printing?",
    a: "3D printing is one tool inside our rapid-prototyping toolkit. Depending on the part, we may also use fiber laser cutting, sheet metal bending or welding — or a combination — whichever gets you a usable, representative part fastest.",
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
    a: "Industrial equipment, automotive, robotics, consumer electronics and architecture / product design. If your idea exists as a sketch or CAD model, we can usually prototype it.",
  },
];

export const Route = createFileRoute("/rapid-prototyping")({
  head: () =>
    buildServiceHead({
      title: "Rapid Prototyping Services in Greece | TOREO",
      description:
        "Rapid prototyping in Thessaloniki: CAD review, 3D printing, fiber laser cutting and sheet metal bending. Project requirements are reviewed before quotation.",
      path: "/rapid-prototyping",
      altPath: "/gr/rapid-prototyping",
      locale: "en",
      serviceName: "Rapid Prototyping Services",
      serviceDescription:
        "Engineering-led rapid prototyping combining 3D printing, fiber laser cutting and sheet metal fabrication for industrial clients.",
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      locale="en"
      kicker="Rapid Prototyping"
      h1="Rapid Prototyping — From CAD to Working Part"
      heroSub="3D printing, fiber laser cutting and sheet metal fabrication in Thessaloniki. We turn your idea into a real, testable prototype. Lead time depends on material, quantity and complexity."
      ctaLabel="Upload CAD & Request a Quote"
      ctaTo="/start-project"
      introTitle="Validate, iterate, and ship"
      introBody={[
        "Rapid prototyping closes the gap between a CAD model and a part you can hold, test and put in front of a customer. Picking the right process — print, cut, fold or weld — is half the work, and that's where our engineering team starts every project.",
        "We've prototyped everything from consumer electronics housings to custom brackets and architectural hardware. The output isn't a generic 3D print: it's a representative part that behaves like the production version.",
      ]}
      industriesTitle="Who we prototype for"
      industries={[
        { title: "Product startups", body: "Functional MVPs for investor demos and user testing." },
        { title: "Industrial R&D", body: "In-house engineers needing fast iterations on jigs, fixtures and tooling." },
        { title: "Robotics & automation", body: "Custom mounts, brackets and end-effectors for one-off and small-series builds." },
        { title: "Architecture & design", body: "Scale models, bespoke hardware and unique structural details." },
        { title: "Automotive & aftermarket", body: "Custom brackets and validation prototypes." },
        { title: "Consumer & lab equipment", body: "Housings, jigs and instrument prototypes." },
      ]}
      processTitle="Our rapid-prototyping workflow"
      process={[
        { step: "Step 01", title: "Send sketch or CAD", body: "Upload anything from a napkin sketch to a full STEP assembly." },
        { step: "Step 02", title: "Process selection", body: "We pick the process that best fits your function and tolerance needs." },
        { step: "Step 03", title: "Prototype produced", body: "3D printed, laser-cut, bent or welded in our own workshop." },
        { step: "Step 04", title: "Iterate to production", body: "Once validated, we scale the same files into a batch — in-house or via trusted partners." },
      ]}
      materialsTitle="Processes & materials"
      materials={[
        { label: "FDM 3D printing", value: "PLA, ABS, PETG, PC, TPU, carbon-filled" },
        { label: "Fiber laser cutting", value: "Steel, stainless, aluminium sheet metal" },
        { label: "Sheet metal", value: "Press-brake bending, MIG / TIG welding" },
        { label: "CAD design", value: "Concept through manufacturable files" },
        { label: "Finishing", value: "Additional finishing options may be available through selected production partners" },
        { label: "Lead time", value: "Depends on material, quantity and complexity" },
      ]}
      whyTitle="Why teams choose TOREO for prototyping"
      why={[
        { title: "Right process, first time", body: "We pick the manufacturing route that fits your part — not the one we want to upsell." },
        { title: "DFM included", body: "Every quote includes design-for-manufacture notes so the next revision is cheaper and faster." },
        { title: "Engineer reviewed", body: "Every inquiry is reviewed by an engineer before quotation." },
        { title: "Production-ready", body: "Prototypes designed with scale-up in mind, so you don't restart at production." },
      ]}
      faqTitle="Frequently asked questions"
      faq={FAQ}
      finalTitle="From idea to prototype."
      finalBody="Upload your CAD or sketch and we'll review your project and reply with lead time and process recommendation."
    />
  );
}
