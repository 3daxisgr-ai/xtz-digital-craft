import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { capabilities, type CapabilitySlug } from "@/components/xtz/Capabilities";
import { useI18n } from "@/components/xtz/i18n";

type Detail = {
  slug: CapabilitySlug;
  intro: string;
  what: string[];
  materials: string[];
  process: { t: string; d: string }[];
  applications: string[];
  notes?: string;
  seo: { title: string; description: string };
};

const titles: Record<CapabilitySlug, string> = {
  "design-development": "Design & Development",
  "fiber-laser-cutting": "Fiber Laser Cutting",
  "sheet-metal-forming-welding": "Sheet Metal Forming & Welding",
  "3d-printing": "3D Printing",
  "design-to-prototype": "Design → Prototype",
  "global-manufacturing-network": "Mass Production",
};

const titlesGR: Record<CapabilitySlug, string> = {
  "design-development": "Σχεδιασμός & Ανάπτυξη",
  "fiber-laser-cutting": "Κοπή Fiber Laser",
  "sheet-metal-forming-welding": "Στραντζάρισμα & Συγκολλήσεις",
  "3d-printing": "3D Εκτύπωση",
  "design-to-prototype": "Σχεδιασμός → Πρωτότυπο",
  "global-manufacturing-network": "Μαζική Παραγωγή",
};

const details: Record<CapabilitySlug, Detail> = {
  "design-development": {
    slug: "design-development",
    intro:
      "We turn sketches, photos and briefs into precise, manufacturable CAD — engineered for the process that will build it.",
    what: [
      "Concept sketches and feasibility studies.",
      "Parametric 3D CAD and 2D production drawings.",
      "Design for Manufacturing (DFM) and material selection.",
      "Revision control and full documentation.",
    ],
    materials: ["STEP / STP", "IGES", "DWG / DXF", "SolidWorks", "Fusion 360", "PDF / JPG / PNG references"],
    process: [
      { t: "Brief", d: "We review your idea, sketch or reference photos." },
      { t: "Concept", d: "Rough geometry, feasibility and material proposal." },
      { t: "Engineering", d: "Parametric CAD, tolerances and DFM checks." },
      { t: "Handover", d: "Production-ready files and drawings." },
    ],
    applications: ["Custom industrial parts", "Product prototypes", "Brackets and enclosures", "Architectural metalwork"],
    notes: "Accepted formats: .pdf, .jpg, .png, .step, .stp, .iges, .dwg, .dxf.",
    seo: {
      title: "Design & Development — SKG3D",
      description: "From sketch to manufacturable CAD. Engineering, DFM and full documentation by SKG3D.",
    },
  },
  "fiber-laser-cutting": {
    slug: "fiber-laser-cutting",
    intro:
      "Precision fiber laser cutting for sheet metal — clean edges, tight tolerances, ready for forming, welding or finishing.",
    what: [
      "High-precision cuts down to ±0.05 mm tolerance.",
      "Industrial sheet sizes and complex contours.",
      "Minimal heat-affected zone and clean edges.",
      "Nesting and material optimization.",
    ],
    materials: ["Mild steel", "Stainless steel", "Aluminum", "Brass", "Copper (on request)"],
    process: [
      { t: "Files", d: "Send .dxf, .dwg or .step with material and thickness." },
      { t: "Quote", d: "Reviewed by an engineer within one business day." },
      { t: "Cut", d: "Nested, cut and edge-checked." },
      { t: "Mass Production", d: "Ready for next step or shipped to you." },
    ],
    applications: ["Brackets and panels", "Enclosures and chassis", "Decorative metal", "Industrial components"],
    notes: "Send .dxf, .dwg or .step. Always include thickness and material grade.",
    seo: {
      title: "Fiber Laser Cutting — SKG3D",
      description: "Precision fiber laser cutting in steel, stainless and aluminum. ±0.05 mm tolerance.",
    },
  },
  "sheet-metal-forming-welding": {
    slug: "sheet-metal-forming-welding",
    intro:
      "Bending, welding and assembly of finished metal parts — from a single bracket to fully welded structures.",
    what: [
      "Press brake forming and precision bending.",
      "MIG, TIG and spot welding.",
      "Hardware insertion (PEM nuts, studs, standoffs).",
      "Assembly, finishing and powder coat-ready prep.",
    ],
    materials: ["Mild steel", "Stainless steel (304, 316)", "Aluminum"],
    process: [
      { t: "Flat pattern", d: "Cut from your CAD or our unfolded drawing." },
      { t: "Form", d: "Bent on calibrated press brakes." },
      { t: "Weld", d: "MIG / TIG / spot, with fixturing where needed." },
      { t: "Finish", d: "Deburr, dress welds, prep for coating." },
    ],
    applications: ["Frames and chassis", "Enclosures and cabinets", "Architectural panels", "Welded assemblies"],
    seo: {
      title: "Sheet Metal Forming & Welding — SKG3D",
      description: "Press brake forming, MIG/TIG/spot welding and assembly of steel, stainless and aluminum.",
    },
  },
  "3d-printing": {
    slug: "3d-printing",
    intro:
      "Functional prototypes and end-use parts — in days, not months. From PLA mock-ups to engineering polymers.",
    what: [
      "Rapid prototypes for fit, form and function.",
      "End-use parts in engineering polymers.",
      "Small and medium production runs.",
      "Post-processing: sanding, painting, threaded inserts.",
    ],
    materials: ["PLA", "ABS", "PETG", "PC", "TPU"],
    process: [
      { t: "Files", d: "Send .stl, .step or .obj." },
      { t: "Slice", d: "We choose orientation, infill and supports." },
      { t: "Print", d: "Calibrated machines, monitored prints." },
      { t: "Finish", d: "Cleaned, post-processed and shipped." },
    ],
    applications: ["Functional prototypes", "Jigs and fixtures", "Custom end-use parts", "Small batch production"],
    notes: "Send .stl, .step or .obj. Include build volume and quantity.",
    seo: {
      title: "3D Printing — SKG3D",
      description: "Functional 3D printing for prototypes and end-use parts in engineering polymers.",
    },
  },
  "design-to-prototype": {
    slug: "design-to-prototype",
    intro:
      "One team, end to end. From the first sketch to a working prototype in your hands — typically in days.",
    what: [
      "Concept, CAD, prototype and iteration loop.",
      "Single point of contact across all stages.",
      "Real engineers reviewing every revision.",
      "Quick turnaround — days, not months.",
    ],
    materials: ["Sketch / brief", "Reference photos", "CAD files", "Existing parts to copy or improve"],
    process: [
      { t: "Idea", d: "Send anything — sketch, photo or description." },
      { t: "Design", d: "We engineer a manufacturable CAD file." },
      { t: "Prototype", d: "Built using the most fitting in-house process." },
      { t: "Iterate", d: "Revise and improve until it's right." },
    ],
    applications: ["Startup MVPs", "New product development", "Reverse engineering", "Custom one-off parts"],
    seo: {
      title: "Design → Prototype — SKG3D",
      description: "From idea to working prototype in days. End-to-end engineering and prototyping under one roof.",
    },
  },
  "global-manufacturing-network": {
    slug: "global-manufacturing-network",
    intro:
      "Trusted manufacturing partners for series production. Scale from prototype to thousands of units — quality and logistics handled.",
    what: [
      "Vetted partners for CNC, casting, injection molding and more.",
      "Scale from hundreds to tens of thousands of units.",
      "Quality control and inspection on your behalf.",
      "Logistics, customs and delivery managed end to end.",
    ],
    materials: ["Metals (steel, stainless, aluminum, brass)", "Engineering polymers", "Cast and molded parts", "Composite materials"],
    process: [
      { t: "Spec", d: "Prototype, drawings and tolerances locked in." },
      { t: "Sourcing", d: "We match the part to the right partner." },
      { t: "Production", d: "Pilot run, QC and full production." },
      { t: "Mass Production", d: "Inspected, packed and shipped to you." },
    ],
    applications: ["Series production", "OEM components", "Branded consumer products", "Replacement and spare parts"],
    seo: {
      title: "​Mass production — SKG3D",
      description: "Scale from prototype to series production with trusted global partners. Managed end to end.",
    },
  },
};

export const Route = createFileRoute("/capabilities/$slug")({
  loader: ({ params }) => {
    const cap = capabilities.find((c) => c.slug === (params.slug as CapabilitySlug));
    if (!cap) throw notFound();
    const detail = details[cap.slug];
    return { cap, detail };
  },
  head: ({ loaderData, params }) => {
    const seo = loaderData?.detail?.seo ?? {
      title: "Capability — SKG3D",
      description: "Engineering and manufacturing capability at SKG3D.",
    };
    const url = `https://xtz-digital-craft.lovable.app/capabilities/${params.slug}`;
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
    };
  },
  component: CapabilityPage,
  notFoundComponent: () => (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <div className="pt-40 px-6 text-center">
        <h1 className="font-display text-3xl">Capability not found.</h1>
        <Link to="/" hash="capabilities" className="text-primary mt-4 inline-block">← All capabilities</Link>
      </div>
      <Footer />
    </main>
  ),
});

function CapabilityPage() {
  const { cap, detail } = Route.useLoaderData() as { cap: typeof capabilities[number]; detail: Detail };
  const { t } = useI18n();
  const related = capabilities.filter((c) => c.slug !== cap.slug).slice(0, 3);

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-36 pb-16 px-6 md:px-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 0%, oklch(0.4 0.18 245 / 0.4), transparent 55%)" }}
        />
        <div className="relative mx-auto max-w-[1200px]">
          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-10 flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="text-muted-foreground/50">/</span>
            <Link to="/" hash="capabilities" className="hover:text-primary transition-colors">Capabilities</Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">{titles[cap.slug]}</span>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">{cap.n} /</span>
            <span className="h-px w-16 bg-primary blue-glow" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("cap.kicker")}
            </span>
          </div>
          <h1
            className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5rem)] tracking-tighter mb-6"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            {titles[cap.slug]}
          </h1>
          <p className="text-foreground/75 text-lg md:text-xl max-w-2xl leading-relaxed">{detail.intro}</p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to={cap.slug === "3d-printing" ? "/3d-printing-quote" : "/start-project"}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow"
            >
              Request a Quote →
            </Link>
            <Link
              to="/"
              hash="capabilities"
              className="inline-flex items-center gap-3 px-6 py-4 border border-border/60 hover:border-primary/60 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← All Capabilities
            </Link>
          </div>
        </div>
      </section>

      {/* What we do + Materials */}
      <section className="px-6 md:px-12 py-20 border-t border-border/40">
        <div className="mx-auto max-w-[1200px] grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">What we do</h2>
            <ul className="space-y-5">
              {detail.what.map((w, i) => (
                <li key={i} className="flex gap-4 text-foreground/85">
                  <span className="font-mono text-[14px] text-primary/70 tracking-[0.3em] pt-2 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-lg md:text-xl leading-snug">{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">Materials & Technologies</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {detail.materials.map((m) => (
                <li key={m} className="border border-border/50 px-4 py-3 font-display text-base hover:border-primary/60 transition-colors">
                  {m}
                </li>
              ))}
            </ul>
            {detail.notes && (
              <p className="text-foreground/65 text-sm leading-relaxed mt-6">{detail.notes}</p>
            )}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-6 md:px-12 py-20 border-t border-border/40 bg-gradient-to-b from-white/[0.015] to-transparent">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-10">Process Overview</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {detail.process.map((p, i) => (
              <div key={p.t} className="relative p-6 border border-border/60 bg-white/[0.02]">
                <div className="font-mono text-[14px] tracking-[0.4em] text-primary/80 mb-4">
                  STEP {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{p.t}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="px-6 md:px-12 py-20 border-t border-border/40">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-8">Applications</h2>
          <div className="flex flex-wrap gap-3">
            {detail.applications.map((a) => (
              <span key={a} className="border border-border/50 px-5 py-3 font-display text-base text-foreground/85">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-24 border-t border-border/40 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.5 0.22 245 / 0.35), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-[1000px] text-center">
          <h2
            className="font-display font-bold leading-[0.95] text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-6"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            Ready to build with {titles[cap.slug]}?
          </h2>
          <p className="text-foreground/70 max-w-xl mx-auto mb-8">
            Send your files or a brief. An engineer will review and reply within one business day.
          </p>
          <Link
            to={cap.slug === "3d-printing" ? "/3d-printing-quote" : "/start-project"}
            className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow"
          >
            Request a Quote →
          </Link>
        </div>
      </section>

      {/* Related */}
      <section className="px-6 md:px-12 py-20 border-t border-border/40">
        <div className="mx-auto max-w-[1500px]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-8">Related Capabilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/capabilities/$slug"
                params={{ slug: r.slug }}
                className="group relative p-8 border border-border/60 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden transition-colors hover:border-primary/60 block"
              >
                <div aria-hidden className="absolute -top-px left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full blue-glow" />
                <div className="font-mono text-[14px] tracking-[0.4em] text-primary/80 mb-4">{r.n}</div>
                <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {titles[r.slug]}
                </h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{t(r.dKey)}</p>
                <span className="mt-6 inline-block font-mono text-[14px] tracking-[0.3em] text-primary opacity-70 group-hover:opacity-100">
                  View capability →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
