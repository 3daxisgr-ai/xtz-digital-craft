import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "Forum — SKG3D Updates" },
      { name: "description", content: "Updates from the SKG3D workshop: new equipment, capabilities, materials and announcements." },
      { property: "og:title", content: "Forum — SKG3D Updates" },
      { property: "og:description", content: "Updates from the SKG3D workshop." },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/forum" },
    ],
    links: [
      { rel: "canonical", href: "https://xtz-digital-craft.lovable.app/forum" },
    ],
  }),
  component: ForumPage,
});

type Post = {
  date: string;
  category: string;
  title: string;
  body: string;
};

const POSTS: Post[] = [
  {
    date: "2026 · 06",
    category: "Equipment",
    title: "New fiber laser online.",
    body: "Higher wattage, faster cuts, cleaner edges on thick stainless. Lead times on metal jobs are down.",
  },
  {
    date: "2026 · 05",
    category: "Materials",
    title: "Engineering polymers added.",
    body: "PA-CF and PETG-CF now available for functional, load-bearing 3D printed parts.",
  },
  {
    date: "2026 · 04",
    category: "Workshop",
    title: "Expanded prototyping bay.",
    body: "More space for parallel builds means faster turnaround on design-to-prototype loops.",
  },
];

function ForumPage() {
  const { lang } = useI18n();
  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />

      <section className="relative pt-40 pb-12 px-6 md:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {lang === "GR" ? "Ενημερώσεις" : "Forum"}
          </div>
          <h1
            className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6.5vw,5rem)] tracking-tighter mb-6"
            style={{ textShadow: "0 0 24px oklch(0.65 0.22 245 / 0.35)" }}
          >
            {lang === "GR" ? "Νέα από το Εργαστήριο" : "Workshop Updates"}
          </h1>
          <p className="text-foreground/65 max-w-xl mx-auto">
            {lang === "GR"
              ? "Νέος εξοπλισμός, υλικά και ανακοινώσεις από το INOO3D."
              : "New equipment, materials and announcements from INOO3D."}
          </p>
        </div>
      </section>

      <section className="relative w-full overflow-hidden bg-black py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.2 245 / 0.2), transparent 60%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 space-y-5">
          {POSTS.map((p, i) => (
            <article
              key={i}
              className="border border-primary/15 hover:border-primary/40 transition-colors p-6 md:p-8"
              style={{ background: "linear-gradient(135deg, oklch(0.15 0.02 245 / 0.4), oklch(0.08 0.01 245 / 0.25))" }}
            >
              <div className="flex items-center justify-between gap-4 mb-4 font-mono text-[14px] uppercase tracking-[0.4em] text-primary">
                <span>{p.category}</span>
                <span className="text-foreground/50">{p.date}</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground mb-3">
                {p.title}
              </h2>
              <p className="text-foreground/75 leading-relaxed font-light max-w-2xl">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
