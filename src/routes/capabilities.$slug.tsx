import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { capabilities, type CapabilitySlug } from "@/components/xtz/Capabilities";
import { useI18n } from "@/components/xtz/i18n";

type Detail = {
  slug: CapabilitySlug;
  what: string[];
  materials?: string[];
  notes?: string[];
};

const details: Record<CapabilitySlug, Detail> = {
  "design-development": {
    slug: "design-development",
    what: [
      "We turn sketches, photos or briefs into manufacturable CAD.",
      "Feasibility, material selection and design for manufacturing (DFM).",
      "Parametric models, drawings and revision control.",
    ],
    notes: ["Files we accept: .pdf, .jpg, .png, .step, .stp, .iges, .dwg, .dxf."],
  },
  "fiber-laser-cutting": {
    slug: "fiber-laser-cutting",
    what: [
      "Precision cuts up to ±0.05mm tolerance.",
      "Sheet sizes up to industrial standard.",
      "Clean edges, minimal heat-affected zone.",
    ],
    materials: ["Mild steel", "Stainless steel", "Aluminum", "Brass", "Copper (on request)"],
    notes: ["Send .dxf, .dwg or .step. Include thickness and material."],
  },
  "sheet-metal": {
    slug: "sheet-metal",
    what: [
      "Press brake forming and bending.",
      "MIG, TIG and spot welding.",
      "Assembly, hardware insertion and finishing.",
    ],
    materials: ["Steel", "Stainless steel", "Aluminum"],
  },
  "3d-printing": {
    slug: "3d-printing",
    what: [
      "Rapid prototypes in days.",
      "Functional end-use parts and custom components.",
      "Small to medium production runs.",
    ],
    materials: ["PLA", "PETG", "ABS", "PA (Nylon)", "TPU", "Engineering polymers on request"],
    notes: ["Send .stl, .step or .obj. Include build volume and quantity."],
  },
  "design-to-prototype": {
    slug: "design-to-prototype",
    what: [
      "From idea to working prototype, one team.",
      "Concept, CAD, prototype and iteration loop.",
      "Quick turnaround — typically days, not months.",
    ],
  },
  "global-network": {
    slug: "global-network",
    what: [
      "Trusted manufacturing partners for series production.",
      "Scale from prototype to thousands of units.",
      "Quality control and logistics handled.",
    ],
  },
};

export const Route = createFileRoute("/capabilities/$slug")({
  loader: ({ params }) => {
    const cap = capabilities.find((c) => c.slug === params.slug);
    if (!cap) throw notFound();
    return { cap, detail: details[cap.slug] };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.cap ? `${enTitle(loaderData.cap.slug)} — 3D AXIS` : "Capability — 3D AXIS";
    return {
      meta: [
        { title },
        { name: "description", content: `${title}. Send us your files and get a quote within one business day.` },
        { property: "og:title", content: title },
      ],
    };
  },
  component: CapabilityPage,
  notFoundComponent: () => (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <div className="pt-40 px-6 text-center">
        <h1 className="font-display text-3xl">Capability not found.</h1>
        <Link to="/capabilities" className="text-primary mt-4 inline-block">← All capabilities</Link>
      </div>
      <Footer />
    </main>
  ),
});

function enTitle(slug: CapabilitySlug): string {
  const map: Record<CapabilitySlug, string> = {
    "design-development": "Design & Development",
    "fiber-laser-cutting": "Fiber Laser Cutting",
    "sheet-metal": "Sheet Metal Forming & Welding",
    "3d-printing": "3D Printing",
    "design-to-prototype": "Design → Prototype",
    "global-network": "Global Manufacturing Network",
  };
  return map[slug];
}

function CapabilityPage() {
  const { cap, detail } = Route.useLoaderData();
  const { t } = useI18n();

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative pt-40 pb-20 px-6 md:px-12">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 0%, oklch(0.4 0.18 245 / 0.4), transparent 55%)" }} />
        <div className="relative mx-auto max-w-[1200px]">
          <Link to="/capabilities" className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors">
            ← {t("nav.capabilities")}
          </Link>
          <div className="flex items-center gap-4 mt-8 mb-6">
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
            {t(cap.tKey)}
          </h1>
          <p className="text-foreground/70 text-lg max-w-2xl mb-16">{t(cap.dKey)}</p>

          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-7">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">What we do</h2>
              <ul className="space-y-4">
                {detail.what.map((w, i) => (
                  <li key={i} className="flex gap-4 text-foreground/80">
                    <span className="font-mono text-[10px] text-primary/70 tracking-[0.3em] pt-1.5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-lg md:text-xl leading-snug">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            {(detail.materials || detail.notes) && (
              <div className="lg:col-span-5 space-y-8">
                {detail.materials && (
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-4">Materials</h3>
                    <ul className="space-y-2">
                      {detail.materials.map((m) => (
                        <li key={m} className="border border-border/50 px-4 py-2.5 font-display text-base">{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.notes && (
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-4">How to send files</h3>
                    {detail.notes.map((n, i) => (
                      <p key={i} className="text-foreground/70 text-sm leading-relaxed">{n}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-10">
            <Link
              to="/"
              hash="inquiry"
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow"
            >
              {t("nav.cta")} →
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center gap-3 px-6 py-4 border border-border/60 hover:border-primary/60 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.faq")}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
