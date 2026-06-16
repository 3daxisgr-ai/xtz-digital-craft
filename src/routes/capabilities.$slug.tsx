import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { capabilities, type CapabilitySlug } from "@/components/xtz/Capabilities";
import { useI18n } from "@/components/xtz/i18n";
import staticLaser from "@/assets/static-laser.png.asset.json";
import bambu from "@/assets/bambu-3d-printing.png.asset.json";
import designPrototype from "@/assets/design-prototype-photo.png.asset.json";
import massProduction from "@/assets/mass-production.png.asset.json";
import designDevelopment from "@/assets/design-development.jpg.asset.json";
import laserWeldingHero from "@/assets/laser-welding-hero.jpg.asset.json";
import capDesignDev2 from "@/assets/cap-design-dev-2.jpg";
import capDesignDev3 from "@/assets/cap-design-dev-3.jpg";
import capLaser2 from "@/assets/cap-laser-2.jpg";
import capLaser3 from "@/assets/cap-laser-3.jpg";
import capWelding2 from "@/assets/cap-welding-2.jpg";
import capWelding3 from "@/assets/cap-welding-3.jpg";
import cap3dp2 from "@/assets/cap-3dp-2.jpg";
import cap3dp3 from "@/assets/cap-3dp-3.jpg";
import capProto2 from "@/assets/cap-proto-2.jpg";
import capProto3 from "@/assets/cap-proto-3.jpg";
import capMass2 from "@/assets/cap-mass-2.jpg";
import capMass3 from "@/assets/cap-mass-3.jpg";

// Each capability page uses three distinct images: hero, showcase, CTA.
const heroImages: Record<CapabilitySlug, string> = {
  "design-development": designDevelopment.url,
  "fiber-laser-cutting": staticLaser.url,
  "sheet-metal-forming-welding": laserWeldingHero.url,
  "3d-printing": bambu.url,
  "design-to-prototype": designPrototype.url,
  "global-manufacturing-network": massProduction.url,
};

const showcaseImages: Record<CapabilitySlug, string> = {
  "design-development": capDesignDev2,
  "fiber-laser-cutting": capLaser2,
  "sheet-metal-forming-welding": capWelding2,
  "3d-printing": cap3dp2,
  "design-to-prototype": capProto2,
  "global-manufacturing-network": capMass2,
};

const ctaImages: Record<CapabilitySlug, string> = {
  "design-development": capDesignDev3,
  "fiber-laser-cutting": capLaser3,
  "sheet-metal-forming-welding": capWelding3,
  "3d-printing": cap3dp3,
  "design-to-prototype": capProto3,
  "global-manufacturing-network": capMass3,
};

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
      title: "Design & Development — TOREO",
      description: "From sketch to manufacturable CAD. Engineering, DFM and full documentation by TOREO.",
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
      title: "Fiber Laser Cutting — TOREO",
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
      title: "Sheet Metal Forming & Welding — TOREO",
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
      title: "3D Printing — TOREO",
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
      title: "Design → Prototype — TOREO",
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
      title: "​Mass production — TOREO",
      description: "Scale from prototype to series production with trusted global partners. Managed end to end.",
    },
  },
};

const detailsGR: Record<CapabilitySlug, Pick<Detail, "intro" | "what" | "process" | "applications" | "notes">> = {
  "design-development": {
    intro: "Μετατρέπουμε σκίτσα, φωτογραφίες και briefs σε ακριβή, κατασκευάσιμα αρχεία CAD — σχεδιασμένα για τη μέθοδο που θα τα παράγει.",
    what: [
      "Σχέδια ιδεών και μελέτες σκοπιμότητας.",
      "Παραμετρικό 3D CAD και κατασκευαστικά σχέδια 2D.",
      "Design for Manufacturing (DFM) και επιλογή υλικών.",
      "Έλεγχος εκδόσεων και πλήρης τεκμηρίωση.",
    ],
    process: [
      { t: "Brief", d: "Εξετάζουμε την ιδέα, το σκίτσο ή τις φωτογραφίες αναφοράς." },
      { t: "Σύλληψη", d: "Πρόχειρη γεωμετρία, σκοπιμότητα και πρόταση υλικού." },
      { t: "Μελέτη", d: "Παραμετρικό CAD, ανοχές και έλεγχοι DFM." },
      { t: "Παράδοση", d: "Έτοιμα αρχεία και σχέδια παραγωγής." },
    ],
    applications: ["Custom βιομηχανικά εξαρτήματα", "Πρωτότυπα προϊόντων", "Βάσεις και περιβλήματα", "Αρχιτεκτονικά μέταλλα"],
    notes: "Δεκτοί τύποι: .pdf, .jpg, .png, .step, .stp, .iges, .dwg, .dxf.",
  },
  "fiber-laser-cutting": {
    intro: "Ακριβής κοπή fiber laser για λαμαρίνα , έτοιμη για στραντζάρισμα, συγκόλληση ή φινίρισμα.",
    what: [
      "Υψηλή ακρίβεια με ανοχή έως ±0.05 mm.",
      "Βιομηχανικά μεγέθη φύλλων και πολύπλοκα περιγράμματα.",
      "Ελάχιστη θερμικά επηρεαζόμενη ζώνη και καθαρές ακμές.",
      "Nesting και βελτιστοποίηση υλικού.",
    ],
    process: [
      { t: "Αρχεία", d: "Στείλτε .dxf, .dwg ή .step με υλικό και πάχος." },
      { t: "Προσφορά", d: "Έλεγχος από μηχανικό εντός μίας εργάσιμης ημέρας." },
      { t: "Κοπή", d: "Nesting, κοπή και έλεγχος ακμών." },
      { t: "Παράδοση", d: "Έτοιμα για το επόμενο βήμα ή αποστολή σε εσάς." },
    ],
    applications: ["Βάσεις και πάνελ", "Περιβλήματα και chassis", "Διακοσμητικά μέταλλα", "Βιομηχανικά εξαρτήματα"],
    notes: "Στείλτε .dxf, .dwg ή .step. Πάντα δηλώστε πάχος και ποιότητα υλικού.",
  },
  "sheet-metal-forming-welding": {
    intro: "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων — από μία βάση έως πλήρως συγκολλημένες κατασκευές.",
    what: [
      "Στραντζάρισμα με πρέσα και ακριβή κάμψη.",
      "Συγκολλήσεις MIG, TIG και πόντες.",
      "Τοποθέτηση εξαρτημάτων (PEM nuts, ντίζες, αποστάτες).",
      "Συναρμολόγηση, φινίρισμα και προετοιμασία για ηλεκτροστατική βαφή.",
    ],
    process: [
      { t: "Flat pattern", d: "Κοπή από το δικό σας ή από δικό μας σχέδιο." },
      { t: "Κάμψη", d: "Κάμψη στην στράντζα." },
      { t: "Συγκόλληση", d: "MIG / TIG / πόντες, με ιδιοκατασκευές όπου χρειάζεται." },
      { t: "Φινίρισμα", d: "Αφαίρεση γρεζιού, τρόχισμα συγκολλήσεων, προετοιμασία βαφής." },
    ],
    applications: ["Πλαίσια και chassis", "Περιβλήματα και ντουλάπια", "Αρχιτεκτονικά πάνελ", "Συγκολλημένες κατασκευές"],
  },
  "3d-printing": {
    intro: "Λειτουργικά πρωτότυπα και τελικά εξαρτήματα — σε ημέρες, όχι μήνες. Από mock-ups σε PLA έως μηχανικά πολυμερή.",
    what: [
      "Γρήγορα πρωτότυπα για fit, form και function.",
      "Τελικά εξαρτήματα σε μηχανικά πολυμερή.",
      "Μικρές και μεσαίες παραγωγές.",
      "Post-processing: τρίψιμο και βαφή.",
    ],
    process: [
      { t: "Αρχεία", d: "Στείλτε .stl, .step ή .obj." },
      { t: "Slicing", d: "Προετοιμασία του μοντέλου για εκτύπωση με τις κατάλληλες ρυθμίσεις ποιότητας, αντοχής και ταχύτητας." },
      { t: "Εκτύπωση", d: "Εξειδικευμένα μηχανήματα υψηλών προδιαγραφών αναλαμβάνουν την κατασκευή του έργου σας." },
      { t: "Φινίρισμα", d: "Καθαρισμός, post-processing και αποστολή." },
    ],
    applications: ["Λειτουργικά πρωτότυπα", "Jigs και fixtures", "Custom εξαρτήματα", "Παραγωγή μικρής σειράς"],
    notes: "Στείλτε .stl, .step ή .obj. Συμπεριλάβετε όγκο κατασκευής και ποσότητα.",
  },
  "design-to-prototype": {
    intro: "Μία ομάδα, από την αρχή έως το τέλος. Από το πρώτο σκίτσο σε λειτουργικό πρωτότυπο στα χέρια σας.",
    what: [
      "Ιδέα , CAD, πρωτότυπο και κύκλος βελτιώσεων.",
      "Ενιαίο σημείο επαφής σε όλα τα στάδια.",
      "Πραγματικοί μηχανικοί ελέγχουν κάθε αναθεώρηση.",
      "Γρήγοροι χρόνοι — ημέρες, όχι μήνες.",
    ],
    process: [
      { t: "Ιδέα", d: "Στείλτε οτιδήποτε — σκίτσο, φωτογραφία ή περιγραφή." },
      { t: "Σχεδιασμός", d: "Δημιουργούμε ένα κατασκευάσιμο αρχείο CAD." },
      { t: "Πρωτότυπο", d: "Κατασκευάζεται με την πιο κατάλληλη in-house μέθοδο." },
      { t: "Βελτίωση", d: "Επανέλεγχος και βελτίωση μέχρι να είναι σωστό." },
    ],
    applications: ["Startup MVPs", "Ανάπτυξη νέων προϊόντων", "Reverse engineering", "Custom μοναδικά εξαρτήματα"],
  },
  "global-manufacturing-network": {
    intro: "Αξιόπιστοι κατασκευαστικοί συνεργάτες για σειριακή παραγωγή. Κλιμακώστε από πρωτότυπο σε χιλιάδες μονάδες — με διαχείριση ποιότητας και logistics.",
    what: [
      "Επιλεγμένοι συνεργάτες για 3d printing, χύτευση, injection molding και άλλα.",
      "Κλιμάκωση από εκατοντάδες σε δεκάδες χιλιάδες μονάδες.",
      "Έλεγχος ποιότητας και επιθεωρήσεις εκ μέρους σας.",
      "Logistics και παράδοση από άκρη σε άκρη.",
    ],
    process: [
      { t: "Προδιαγραφές", d: "Πρωτότυπο, σχέδια και ανοχές οριστικοποιημένα." },
      { t: "Εύρεση συνεργάτη", d: "Βρίσκουμε τον κατάλληλο συνεργάτη παραγωγής με βάση τις απαιτήσεις του έργου σας." },
      { t: "Παραγωγή", d: "Δοκιμαστική σειρά, ποιοτικός έλεγχος και πλήρης παραγωγή." },
      { t: "Παράδοση", d: "Ελεγμένα, συσκευασμένα και αποστολή σε εσάς." },
    ],
    applications: ["Σειριακή παραγωγή", "OEM εξαρτήματα", "Branded καταναλωτικά προϊόντα", "Ανταλλακτικά"],
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
      title: "Capability — TOREO",
      description: "Engineering and manufacturing capability at TOREO.",
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
  notFoundComponent: () => {
    const { lang } = useI18n();
    return (
      <main className="bg-black text-foreground min-h-screen">
        <Navigation />
        <div className="pt-40 px-6 text-center">
          <h1 className="font-display text-3xl">
            {lang === "GR" ? "Η δυνατότητα δεν βρέθηκε." : "Capability not found."}
          </h1>
          <Link to="/" hash="capabilities" className="text-primary mt-4 inline-block">
            {lang === "GR" ? "← Όλες οι δυνατότητες" : "← All capabilities"}
          </Link>
        </div>
        <Footer />
      </main>
    );
  },
});

function CapabilityPage() {
  const { cap, detail } = Route.useLoaderData() as { cap: typeof capabilities[number]; detail: Detail };
  const { t, lang } = useI18n();
  const isGR = lang === "GR";
  const titleMap = isGR ? titlesGR : titles;
  const grOverride = isGR ? detailsGR[cap.slug] : null;
  const view = {
    intro: grOverride?.intro ?? detail.intro,
    what: grOverride?.what ?? detail.what,
    process: grOverride?.process ?? detail.process,
    applications: grOverride?.applications ?? detail.applications,
    notes: grOverride?.notes ?? detail.notes,
    materials: detail.materials,
  };
  const related = capabilities.filter((c) => c.slug !== cap.slug).slice(0, 3);
  const heroImg = heroImages[cap.slug];
  const showcaseImg = showcaseImages[cap.slug];
  const ctaImg = ctaImages[cap.slug];

  return (
    <main className="bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      {/* Hero image banner */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[68vh] min-h-[520px] max-h-[820px] w-full">
          <img
            src={heroImg}
            alt={titleMap[cap.slug]}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          {/* Readability overlay — gradient from bottom for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.15) 35%, rgba(15,23,42,0.75) 100%)",
            }}
          />
          {/* subtle blue accent */}
          <div
            className="absolute inset-0 opacity-50 mix-blend-screen pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 20%, oklch(0.65 0.18 245 / 0.25), transparent 60%)" }}
          />

          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="mx-auto w-full max-w-[1200px] px-6 md:px-12 pb-12 md:pb-16 text-white">
              <nav aria-label="breadcrumb" className="font-mono text-[12px] uppercase tracking-[0.3em] text-white/70 mb-6 flex flex-wrap items-center gap-2">
                <Link to="/" className="hover:text-white transition-colors">{t("capp.crumb.home")}</Link>
                <span className="text-white/40">/</span>
                <Link to="/" hash="capabilities" className="hover:text-white transition-colors">{t("capp.crumb.caps")}</Link>
                <span className="text-white/40">/</span>
                <span className="text-white">{titleMap[cap.slug]}</span>
              </nav>
              <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-sky-300">
                {t("cap.kicker")}
              </span>
              <h1 className="mt-4 font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5rem)] tracking-tighter max-w-4xl">
                {titleMap[cap.slug]}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Intro + CTA on light surface */}
      <section className="px-6 md:px-12 py-20 md:py-24 bg-slate-950">
        <div className="mx-auto max-w-[1200px] grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-5">
              {t("capp.h.what")}
            </h2>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed">{view.intro}</p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
            <Link
              to={cap.slug === "3d-printing" ? "/3d-printing-quote" : "/start-project"}
              className="inline-flex items-center gap-3 px-8 py-4 bg-sky-600 text-white font-mono text-xs uppercase tracking-[0.3em] hover:bg-sky-700 transition shadow-lg shadow-sky-600/20"
            >
              {t("capp.cta.quote")} →
            </Link>
            <Link
              to="/"
              hash="capabilities"
              className="inline-flex items-center gap-3 px-6 py-4 border border-white/15 hover:border-sky-400 font-mono text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-sky-300 transition-colors"
            >
              ← {t("capp.cta.all")}
            </Link>
          </div>
        </div>
      </section>

      {/* What we do — alternating: text left, image right */}
      <section className="px-6 md:px-12 py-16 md:py-24 bg-slate-900">
        <div className="mx-auto max-w-[1300px] grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-8">
              {t("capp.h.what")}
            </h2>
            <ul className="space-y-6">
              {view.what.map((w, i) => (
                <li key={i} className="flex gap-5">
                  <span className="font-mono text-[14px] text-sky-400 tracking-[0.3em] pt-2 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-lg md:text-xl leading-snug text-slate-100">{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2 relative">
            <div className="relative aspect-[4/5] lg:aspect-[5/6] overflow-hidden rounded-sm shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <img
                src={showcaseImg}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden md:block w-24 h-24 border-2 border-sky-500/40" />
          </div>
        </div>
      </section>

      {/* Full-width showcase banner */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[40vh] min-h-[320px] max-h-[520px]">
          <img
            src={heroImg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.15) 100%)" }}
          />
          <div className="relative h-full mx-auto max-w-[1200px] px-6 md:px-12 flex items-center">
            <p className="font-display text-white text-2xl md:text-4xl leading-tight max-w-xl">
              {view.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Materials — light cards */}
      <section className="px-6 md:px-12 py-20 md:py-24 bg-slate-950">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-10">
            {t("capp.h.materials")}
          </h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {view.materials.map((m) => (
              <li
                key={m}
                className="bg-slate-900 border border-white/10 rounded-sm px-5 py-5 font-display text-base text-slate-100 shadow-sm hover:shadow-md hover:border-sky-500/60 hover:-translate-y-0.5 transition-all"
              >
                {m}
              </li>
            ))}
          </ul>
          {view.notes && (
            <p className="text-slate-400 text-sm leading-relaxed mt-8 max-w-2xl">{view.notes}</p>
          )}
        </div>
      </section>

      {/* Process — bright cards on light gray */}
      <section className="px-6 md:px-12 py-20 md:py-24 bg-slate-900 border-y border-white/10">
        <div className="mx-auto max-w-[1300px]">
          <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-4">
                {t("capp.h.process")}
              </h2>
              <p className="font-display text-3xl md:text-5xl tracking-tight text-white leading-[1.05]">
                {titleMap[cap.slug]}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {view.process.map((p, i) => (
              <div
                key={p.t}
                className="relative p-7 bg-slate-900 border border-white/10 rounded-sm shadow-lg shadow-black/30 hover:shadow-xl hover:-translate-y-1 hover:border-sky-500/60 transition-all"
              >
                <div className="absolute top-0 left-0 h-1 w-12 bg-sky-500" />
                <div className="font-mono text-[12px] tracking-[0.4em] text-sky-400 mb-4 mt-2">
                  {t("capp.step")} {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 text-white">{p.t}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Applications + supporting image */}
      <section className="px-6 md:px-12 py-20 md:py-24 bg-slate-950">
        <div className="mx-auto max-w-[1300px] grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <img
                src={showcaseImg}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-8">
              {t("capp.h.apps")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {view.applications.map((a) => (
                <span
                  key={a}
                  className="bg-white/5 border border-white/10 rounded-full px-5 py-3 font-display text-base text-slate-100 hover:border-sky-400/60 hover:bg-white/10 transition-colors"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA — bright with image background */}
      <section className="relative px-6 md:px-12 py-24 overflow-hidden">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.88) 60%, rgba(7,32,72,0.85) 100%)" }}
        />
        <div className="relative mx-auto max-w-[1000px] text-center">
          <h2 className="font-display font-bold leading-[0.95] text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-6 text-white">
            {t("capp.ready1")} {titleMap[cap.slug]}{isGR ? ";" : "?"}
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-10 text-lg">
            {t("capp.ready.body")}
          </p>
          <Link
            to={cap.slug === "3d-printing" ? "/3d-printing-quote" : "/start-project"}
            className="inline-flex items-center gap-3 px-10 py-5 bg-sky-600 text-white font-mono text-xs uppercase tracking-[0.3em] hover:bg-sky-700 transition shadow-xl shadow-sky-600/25"
          >
            {t("capp.cta.quote")} →
          </Link>
        </div>
      </section>

      {/* Related */}
      <section className="px-6 md:px-12 py-20 md:py-24 bg-slate-950 border-t border-white/10">
        <div className="mx-auto max-w-[1500px]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.5em] text-sky-400 mb-10">
            {t("capp.h.related")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/capabilities/$slug"
                params={{ slug: r.slug }}
                className="group relative overflow-hidden bg-slate-900 border border-white/10 rounded-sm shadow-lg shadow-black/30 hover:shadow-xl hover:-translate-y-1 hover:border-sky-500/60 transition-all block"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={heroImages[r.slug]}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.55) 100%)" }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight mb-3 text-white group-hover:text-sky-300 transition-colors">
                    {titleMap[r.slug]}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{t(r.dKey)}</p>
                  <span className="mt-5 inline-block font-mono text-[12px] tracking-[0.3em] text-sky-400 group-hover:text-sky-300">
                    {t("capp.view")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
