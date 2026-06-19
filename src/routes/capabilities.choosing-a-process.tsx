import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";

const CANONICAL = "https://www.toreo.gr/capabilities/choosing-a-process";
const TITLE = "Choosing the Right Manufacturing Process for Your Prototype";
const DESCRIPTION =
  "Compare 3D printing, fiber laser cutting, and sheet metal forming to decide which custom manufacturing process fits your prototype's geometry, material, volume, and timeline.";

export const Route = createFileRoute("/capabilities/choosing-a-process")({
  component: ChoosingAProcessPage,
  head: () => ({
    meta: [
      { title: `${TITLE} — TOREO` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "TOREO" },
          publisher: { "@type": "Organization", name: "TOREO" },
          mainEntityOfPage: CANONICAL,
        }),
      },
    ],
  }),
});

type Row = {
  process: string;
  strength: string;
  bestFor: string;
  materials: string;
  tolerance: string;
  volume: string;
  lead: string;
};

const rowsEN: Row[] = [
  {
    process: "3D Printing (FDM/MJF)",
    strength: "Speed & geometric complexity",
    bestFor: "One-offs, internal channels, organic shapes, fit checks",
    materials: "PLA, PETG, PA12, TPU, carbon-filled nylons",
    tolerance: "±0.2–0.5 mm",
    volume: "1–50 parts",
    lead: "24–72 h",
  },
  {
    process: "Fiber Laser Cutting",
    strength: "Precision & repeatability on flat stock",
    bestFor: "Brackets, panels, enclosures, gaskets, prototypes from sheet",
    materials: "Mild steel, stainless, aluminum, brass, copper (0.5–20 mm)",
    tolerance: "±0.05–0.1 mm",
    volume: "1–10,000 parts",
    lead: "1–5 days",
  },
  {
    process: "Sheet Metal Forming & Welding",
    strength: "Strength, scale & finished assemblies",
    bestFor: "Chassis, frames, housings, weldments, structural parts",
    materials: "Steel, stainless, aluminum sheet & tube",
    tolerance: "±0.2–0.5 mm",
    volume: "10–10,000+ parts",
    lead: "1–4 weeks",
  },
];

const rowsGR: Row[] = [
  {
    process: "3D Εκτύπωση (FDM/MJF)",
    strength: "Ταχύτητα & γεωμετρική πολυπλοκότητα",
    bestFor: "Μοναδικά κομμάτια, εσωτερικά κανάλια, οργανικά σχήματα",
    materials: "PLA, PETG, PA12, TPU, νάιλον με ίνες",
    tolerance: "±0.2–0.5 mm",
    volume: "1–50 τεμάχια",
    lead: "24–72 ώρες",
  },
  {
    process: "Κοπή Fiber Laser",
    strength: "Ακρίβεια & επαναληψιμότητα σε λαμαρίνα",
    bestFor: "Βάσεις, πάνελ, περιβλήματα, φλάντζες, πρωτότυπα από φύλλο",
    materials: "Μαλακός χάλυβας, inox, αλουμίνιο, ορείχαλκος, χαλκός (0,5–20 mm)",
    tolerance: "±0.05–0.1 mm",
    volume: "1–10.000 τεμάχια",
    lead: "1–5 ημέρες",
  },
  {
    process: "Διαμόρφωση & Συγκόλληση Λαμαρίνας",
    strength: "Αντοχή, κλίμακα & ολοκληρωμένες συναρμολογήσεις",
    bestFor: "Σασί, πλαίσια, κελύφη, συγκολλητά, δομικά μέρη",
    materials: "Χάλυβας, inox, φύλλο & σωλήνα αλουμινίου",
    tolerance: "±0.2–0.5 mm",
    volume: "10–10.000+ τεμάχια",
    lead: "1–4 εβδομάδες",
  },
];

const decisionEN = [
  { q: "Need it in days, not weeks?", a: "Start with 3D printing for proof-of-concept geometry." },
  { q: "Flat parts that bolt or weld together?", a: "Fiber laser cutting will give you tight tolerances and clean edges." },
  { q: "Structural, load-bearing, or enclosed?", a: "Sheet metal forming & welding combines laser-cut blanks into a finished assembly." },
  { q: "Going to production volumes?", a: "Laser cutting + sheet metal scales cleanly; 3D printing is for low volumes or hybrid parts." },
  { q: "Not sure yet?", a: "Send us your CAD or sketch — we'll recommend the right mix." },
];

const decisionGR = [
  { q: "Το χρειάζεσαι σε ημέρες, όχι εβδομάδες;", a: "Ξεκίνα με 3D εκτύπωση για επαλήθευση γεωμετρίας." },
  { q: "Επίπεδα μέρη που βιδώνουν ή συγκολλούνται;", a: "Η κοπή fiber laser δίνει στενές ανοχές και καθαρές ακμές." },
  { q: "Δομικό, φορτιζόμενο ή κλειστό περίβλημα;", a: "Διαμόρφωση & συγκόλληση λαμαρίνας συνδυάζει κομμένα blanks σε τελική κατασκευή." },
  { q: "Πας σε παραγωγική ποσότητα;", a: "Laser + λαμαρίνα κλιμακώνονται καθαρά· η 3D εκτύπωση είναι για χαμηλούς όγκους." },
  { q: "Δεν είσαι σίγουρος;", a: "Στείλε μας το CAD ή το σκίτσο — προτείνουμε τον σωστό συνδυασμό." },
];

function ChoosingAProcessPage() {
  const { lang } = useI18n();
  const isGR = lang === "GR";
  const rows = isGR ? rowsGR : rowsEN;
  const decision = isGR ? decisionGR : decisionEN;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <article className="mx-auto max-w-[1100px] px-6 md:px-10 pt-32 pb-24">
        <header className="mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.45em] text-primary/80 mb-4">
            {isGR ? "Οδηγός" : "Guide"}
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-light tracking-tight">
            {isGR
              ? "Επιλέγοντας τη σωστή διαδικασία κατασκευής για το πρωτότυπό σας"
              : TITLE}
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {isGR
              ? "Σύγκριση 3D εκτύπωσης, κοπής fiber laser και διαμόρφωσης λαμαρίνας για να αποφασίσετε ποια διαδικασία custom manufacturing ταιριάζει στη γεωμετρία, το υλικό, την ποσότητα και το χρονοδιάγραμμά σας."
              : DESCRIPTION}
          </p>
        </header>

        <section className="mb-16">
          <h2 className="font-display text-2xl md:text-3xl mb-6">
            {isGR ? "Σύγκριση μεθόδων" : "Comparison at a glance"}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Μέθοδος" : "Process"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Δυνατό σημείο" : "Strength"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Καλύτερο για" : "Best for"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Υλικά" : "Materials"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Ανοχή" : "Tolerance"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Ποσότητα" : "Volume"}</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">{isGR ? "Χρόνος" : "Lead time"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.process} className="border-t border-border/60 align-top">
                    <td className="px-4 py-4 font-medium">{r.process}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.strength}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.bestFor}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.materials}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.tolerance}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.volume}</td>
                    <td className="px-4 py-4 text-muted-foreground">{r.lead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-2xl md:text-3xl mb-6">
            {isGR ? "Πίνακας απόφασης" : "Decision matrix"}
          </h2>
          <ul className="space-y-4">
            {decision.map((d) => (
              <li key={d.q} className="border-l-2 border-primary/60 pl-5 py-1">
                <div className="font-display text-lg">{d.q}</div>
                <div className="text-muted-foreground mt-1">{d.a}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16 grid md:grid-cols-3 gap-6">
          <Link to="/capabilities/$slug" params={{ slug: "3d-printing" }} className="block rounded-lg border border-border/60 p-6 hover:border-primary/60 transition">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{isGR ? "Μάθε περισσότερα" : "Learn more"}</div>
            <div className="font-display text-xl">3D Printing</div>
          </Link>
          <Link to="/capabilities/$slug" params={{ slug: "fiber-laser-cutting" }} className="block rounded-lg border border-border/60 p-6 hover:border-primary/60 transition">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{isGR ? "Μάθε περισσότερα" : "Learn more"}</div>
            <div className="font-display text-xl">{isGR ? "Κοπή Fiber Laser" : "Fiber Laser Cutting"}</div>
          </Link>
          <Link to="/capabilities/$slug" params={{ slug: "sheet-metal-forming-welding" }} className="block rounded-lg border border-border/60 p-6 hover:border-primary/60 transition">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{isGR ? "Μάθε περισσότερα" : "Learn more"}</div>
            <div className="font-display text-xl">{isGR ? "Λαμαρίνα & Συγκόλληση" : "Sheet Metal & Welding"}</div>
          </Link>
        </section>

        <section className="rounded-xl border border-primary/40 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-3">
            {isGR ? "Όχι σίγουρος; Στείλε μας το αρχείο σου." : "Not sure? Send us your file."}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {isGR
              ? "Ένας μηχανικός θα ελέγξει τη γεωμετρία και θα προτείνει τη σωστή μέθοδο σε 1 εργάσιμη ημέρα."
              : "An engineer will review your geometry and recommend the right process within 1 business day."}
          </p>
          <Link
            to="/start-project"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-mono text-[12px] uppercase tracking-[0.3em] hover:opacity-90 transition"
          >
            {isGR ? "Ξεκίνα το έργο σου" : "Start your project"} →
          </Link>
        </section>
      </article>

      <Footer />
    </div>
  );
}
