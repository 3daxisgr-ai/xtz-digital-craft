import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";
import bambuAsset from "@/assets/bambu-3d-printing.png.asset.json";
import laserAsset from "@/assets/fiber-laser-machine.jpg.asset.json";
import weldingAsset from "@/assets/welding-sparks.jpg.asset.json";


export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start a Project — Choose Category | SKG3D" },
      { name: "description", content: "Choose a service category to begin your project: 3D printing, fiber laser cutting, or sheet metal forming & welding." },
      { property: "og:title", content: "Start a Project — Choose Category | SKG3D" },
      { property: "og:description", content: "Pick a service category and continue to your tailored project form." },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/start" },
    ],
    links: [{ rel: "canonical", href: "https://xtz-digital-craft.lovable.app/start" }],
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
    titleGR: "3D Εκτύπωση — Πρωτοτυποποίηση",
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
    to: "/start-project",
    search: { service: "Fiber Laser Cutting" },
    image: laserAsset.url,
    imageAlt: "Fiber laser cutting a metal sheet with sparks",
  },
  {
    id: "sheet",
    titleEN: "Sheet Metal Forming — Welding",
    titleGR: "Στραντζάρισμα — Συγκολλήσεις",
    descEN: "Bending, welding and assembly of metal parts.",
    descGR: "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων.",
    to: "/start-project",
    search: { service: "Sheet Metal Forming & Welding" },
    image: weldingAsset.url,
    imageAlt: "Welder fabricating a metal part with bright sparks",
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
              {isGR ? "Επιλέξτε Κατηγορία" : "Choose a Category"}
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

        </div>
      </section>
      <Footer />
    </main>
  );
}
