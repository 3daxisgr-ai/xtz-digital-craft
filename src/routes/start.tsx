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
  icon: React.ReactNode;
};

const categories: Category[] = [
  {
    id: "3d",
    titleEN: "3D Printing — Prototyping",
    titleGR: "3D Εκτύπωση — Πρωτοτυποποίηση",
    descEN: "Functional prototypes, multi-color & engineering parts.",
    descGR: "Λειτουργικά πρωτότυπα, πολύχρωμη εκτύπωση & εξαρτήματα μηχανικής.",
    to: "/3d-printing-quote",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
        <path d="M3 7l9 5 9-5M12 12v10" />
      </svg>
    ),
  },
  {
    id: "laser",
    titleEN: "Fiber Laser Cutting",
    titleGR: "Κοπή Fiber Laser",
    descEN: "Precision cuts in steel, aluminium and stainless.",
    descGR: "Ακριβής κοπή σε χάλυβα, αλουμίνιο και ανοξείδωτο.",
    to: "/start-project",
    search: { service: "Fiber Laser Cutting" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
        <path d="M12 2v8M12 14v8M4 12h6M14 12h6" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: "sheet",
    titleEN: "Sheet Metal Forming — Welding",
    titleGR: "Στραντζάρισμα — Συγκολλήσεις",
    descEN: "Bending, welding and assembly of metal parts.",
    descGR: "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων.",
    to: "/start-project",
    search: { service: "Sheet Metal Forming & Welding" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
        <path d="M3 17l6-10 6 10M15 7l6 10" />
        <path d="M3 21h18" />
      </svg>
    ),
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
                className="group glass-panel grain p-8 md:p-10 flex flex-col gap-6 border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 hover:blue-glow"
              >
                <div className="text-primary group-hover:scale-110 transition-transform duration-300">{c.icon}</div>
                <div className="space-y-3">
                  <h2 className="font-display text-2xl md:text-3xl leading-tight tracking-tight">
                    {isGR ? c.titleGR : c.titleEN}
                  </h2>
                  <p className="text-sm text-foreground/60 leading-relaxed">{isGR ? c.descGR : c.descEN}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">
                    {isGR ? "Συνέχεια" : "Continue"}
                  </span>
                  <span className="text-primary text-lg">→</span>
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
