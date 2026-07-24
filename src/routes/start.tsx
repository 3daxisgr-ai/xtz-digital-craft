import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";
import bambuAsset from "@/assets/bambu-3d-printing.png.asset.json";
import laserAsset from "@/assets/fiber-laser-machine.jpg.asset.json";
import bendingAsset from "@/assets/durmapress-stratza.webp.asset.json";
import weldingAsset from "@/assets/laser-welding.jpg.asset.json";
import designAsset from "@/assets/cad-design-sheet-metal.png.asset.json";
import replacementAsset from "@/assets/3d-printed-replacement-part.png.asset.json";


export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start a Project — 3D Printing, Laser Cutting & Sheet Metal | TOREO" },
      { name: "description", content: "Start your project with TOREO — choose 3D printing, fiber laser cutting or sheet metal bending & welding. Project requirements are reviewed before quotation." },
      { property: "og:title", content: "Start a Project — 3D Printing, Laser Cutting & Sheet Metal | TOREO" },
      { property: "og:description", content: "Pick a service to begin: 3D printing, fiber laser cutting or sheet metal — engineering-led custom parts by TOREO." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/start" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Start a Project | TOREO" },
      { name: "twitter:description", content: "Choose a service to start your project with TOREO." },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/start" }],
  }),
  component: StartPage,
});

type Category = {
  id: string;
  titleEN: string;
  titleGR: string;
  descEN: string;
  descGR: string;
  to: string;
  search?: Record<string, string>;
  image: string;
  imageAlt: string;
};

const categories: Category[] = [
  {
    id: "3d",
    titleEN: "3D Printing — Prototyping",
    titleGR: "3D ΕΚΤΥΠΩΣΗ — ΠΡΩΤΟΤΥΠΟΠΟΙΗΣΗ",
    descEN: "Functional prototypes, multi-color & engineering parts.",
    descGR: "Λειτουργικά πρωτότυπα, πολύχρωμη εκτύπωση & εξαρτήματα μηχανικής.",
    to: "/3d-printing-quote",
    image: bambuAsset.url,
    imageAlt: "Bambu Lab 3D printer printing a part",
  },
  {
    id: "laser",
    titleEN: "Fiber Laser Cutting",
    titleGR: "Κοπή Fiber Laser",
    descEN: "Precision cuts in steel, aluminium and stainless.",
    descGR: "Ακριβής κοπή σε χάλυβα, αλουμίνιο και ανοξείδωτο.",
    to: "/request",
    search: { service: "laser" },
    image: laserAsset.url,
    imageAlt: "Fiber laser cutting a metal sheet with sparks",
  },
  {
    id: "sheet",
    titleEN: "Sheet Metal Bending / Forming",
    titleGR: "Στραντζάρισμα — Διαμόρφωση Λαμαρίνας",
    descEN: "Bending and forming of metal parts.",
    descGR: "Κάμψη και διαμόρφωση μεταλλικών εξαρτημάτων.",
    to: "/request",
    search: { service: "bending" },
    image: "/laser-welding.png",
    imageAlt: "Sheet metal bending",
  },
  {
    id: "welding",
    titleEN: "Welding / Complete Fabrication",
    titleGR: "Συγκόλληση / Πλήρης Κατασκευή",
    descEN: "Frames, bases, structures and complete metal constructions.",
    descGR: "Πλαίσια, βάσεις, δομές και πλήρεις μεταλλικές κατασκευές.",
    to: "/request",
    search: { service: "welding" },
    image: "/laser-welding.png",
    imageAlt: "Welding operation",
  },
  {
    id: "replacement",
    titleEN: "Replacement Part",
    titleGR: "Ανταλλακτικό / Αναπαραγωγή",
    descEN: "Recreate a damaged or unavailable part from photos or dimensions.",
    descGR: "Αναπαραγωγή κατεστραμμένου ή μη διαθέσιμου εξαρτήματος από φωτογραφίες ή διαστάσεις.",
    to: "/request",
    search: { service: "replacement" },
    image: laserAsset.url,
    imageAlt: "Replacement metal part",
  },
  {
    id: "design",
    titleEN: "Product Design / I Only Have an Idea",
    titleGR: "Σχεδιασμός Προϊόντος / Ιδέα",
    descEN: "Start with an idea, sketch or reference and receive design support.",
    descGR: "Ξεκινήστε με ιδέα, σκίτσο ή αναφορά και λάβετε υποστήριξη σχεδιασμού.",
    to: "/request",
    search: { service: "design" },
    image: bambuAsset.url,
    imageAlt: "Product design sketches",
  },
];

function StartPage() {
  const { lang } = useI18n();
  const isGR = lang === "GR";

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative min-h-screen w-full inox-surface py-32 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 50%, oklch(0.45 0.2 245 / 0.5), transparent 60%)" }}
        />
        <span className="absolute top-6 right-6 md:top-10 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
            <span className="h-px w-16 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {isGR ? "ΕΠΙΛΕΞΤΕ ΚΑΤΗΓΟΡΙΑ" : "Choose a Category"}
            </span>
          </div>
          <h1 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-6 max-w-3xl">
            {isGR ? "Τι θέλετε να κατασκευάσουμε;" : "What do you want to build?"}
          </h1>
          <p className="text-foreground/60 max-w-xl mb-12">
            {isGR
              ? "Επιλέξτε μία κατηγορία για να συνεχίσετε στη φόρμα αιτήματος."
              : "Pick one category to continue to the right inquiry form."}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={c.to}
                search={c.search as never}
                className="group glass-panel grain overflow-hidden flex flex-col border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 hover:blue-glow"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  <img
                    src={c.image}
                    alt={c.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h2 className="font-display text-xl md:text-2xl leading-tight tracking-tight text-white drop-shadow">
                      {isGR ? c.titleGR : c.titleEN}
                    </h2>
                  </div>
                </div>
                <div className="p-6 md:p-7 flex flex-col gap-5 flex-1">
                  <p className="text-sm text-foreground/65 leading-relaxed">{isGR ? c.descGR : c.descEN}</p>
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">
                      {isGR ? "Συνέχεια" : "Continue"}
                    </span>
                    <span className="text-primary text-lg transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 md:mt-20 text-center">
            <p className="text-sm text-foreground/45 max-w-lg mx-auto mb-5">
              {isGR
                ? "Δεν βρίσκετε αυτό που χρειάζεστε; Επικοινωνήστε μαζί μας και θα σας βοηθήσουμε απευθείας."
                : "Don't see what you need? Contact us and we will help you directly."}
            </p>
            <a
              href="mailto:info@toreo.gr"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground/60 hover:text-foreground hover:border-primary hover:blue-glow transition-all duration-300"
            >
              {isGR ? "Επικοινωνία" : "Contact Us"}
            </a>
          </div>

        </div>
      </section>
      <Footer />
    </main>
  );
}
