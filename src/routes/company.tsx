import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";
import heroLaser from "@/assets/hero-laser.jpg.asset.json";
import cadAsset from "@/assets/cad-workshop.png.asset.json";
import printAsset from "@/assets/bambu-3d-printing.png.asset.json";
import laserAsset from "@/assets/akj-laser-cutting.jpg.asset.json";
import productAsset from "@/assets/design-prototype-photo.png.asset.json";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "About TOREO — Engineering & Product Development in Greece" },
      { name: "description", content: "TOREO is a Thessaloniki manufacturer offering engineering services, product development, 3D printing and CNC machining across Greece and Europe." },
      { name: "keywords", content: "engineering services, product development, prototype manufacturing, custom parts manufacturing, CNC machining Greece, Thessaloniki manufacturing" },
      { property: "og:title", content: "About TOREO — Engineering & Product Development in Greece" },
      { property: "og:description", content: "Engineering ideas into reality through modern manufacturing — 3D printing, CNC, laser cutting and product development in Thessaloniki." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/company" },
      { property: "og:image", content: `https://www.toreo.gr${heroLaser.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About TOREO — Engineering & Product Development" },
      { name: "twitter:description", content: "Modern manufacturing partner in Greece for prototyping, 3D printing, CNC and custom parts." },
      { name: "twitter:image", content: `https://www.toreo.gr${heroLaser.url}` },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/company" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About TOREO",
          url: "https://www.toreo.gr/company",
          about: {
            "@type": "Organization",
            name: "TOREO",
            url: "https://www.toreo.gr",
            address: { "@type": "PostalAddress", addressLocality: "Thessaloniki", addressCountry: "GR" },
          },
        }),
      },
    ],
  }),
  component: CompanyPage,
});

const en = {
  heroTitle: "Company",
  heroSub: "Engineering ideas into reality through modern manufacturing.",
  s1Tag: "01 — Who We Are",
  s1Title: "A modern manufacturing company.",
  s1Body1: "TOREO is a modern manufacturing company focused on helping individuals, startups, creators, engineers, and businesses transform ideas into real products.",
  s1Body2: "Through advanced 3D printing, laser cutting, CAD design, and custom manufacturing solutions, we bridge the gap between concept and production.",
  s1Body3: "Our goal is simple: make professional manufacturing accessible, efficient, and reliable.",
  s2Tag: "02 — Heritage",
  s2Title: "The meaning behind TOREO.",
  s2Body1: 'The name TOREO originates from the ancient Greek word "τορεύω" (torevo).',
  s2Body2: "In ancient Greece, the word described the art of shaping, refining, engraving, and crafting metal with precision and skill. Master craftsmen used this process to transform raw materials into objects of value, functionality, and beauty.",
  s2Body3: "Although technology has evolved, the principle remains the same. Today, TOREO continues this tradition through modern manufacturing technologies — combining engineering knowledge, digital design, and precision production to transform ideas into reality.",
  s2Body4: "Our name represents the connection between traditional craftsmanship and modern innovation.",
  s3Tag: "03 — What We Do",
  s3Title: "Four capabilities. One workflow.",
  s3c1t: "3D Printing",
  s3c1d: "Rapid prototyping, custom parts, functional components, product development, and low-volume production.",
  s3c2t: "Laser Cutting",
  s3c2d: "Precision cutting and engraving for industrial, commercial, and creative applications.",
  s3c3t: "CAD Design",
  s3c3d: "Professional design, modeling, optimization, and manufacturing preparation.",
  s3c4t: "Custom Manufacturing",
  s3c4d: "End-to-end support from idea validation to final production.",
  s4Tag: "04 — Why TOREO",
  s4Title: "Why clients choose us.",
  s4i1t: "Precision",
  s4i1d: "Every project is approached with attention to detail.",
  s4i2t: "Reliability",
  s4i2d: "Clear communication and dependable delivery.",
  s4i3t: "Innovation",
  s4i3d: "Modern tools and technologies for modern challenges.",
  s4i4t: "Flexibility",
  s4i4d: "Solutions tailored to each project's requirements.",
  s4i5t: "Support",
  s4i5d: "Guidance throughout the entire manufacturing process.",
  s4i6t: "Quality",
  s4i6d: "A commitment to professional results and continuous improvement.",
  s5Tag: "05 — Vision",
  s5Title: "Our vision.",
  s5Body1: "We believe manufacturing should empower innovation.",
  s5Body2: "Our vision is to become a trusted manufacturing partner for creators, engineers, startups, and businesses seeking high-quality production solutions.",
  s5Body3: "By combining technology, craftsmanship, and problem solving, we aim to help transform ideas into successful products.",
  quote: "From the craftsmanship of the past to the manufacturing of the future.",
  quoteTag: "Our promise",
  cta: "Start a Project",
};

const gr: typeof en = {
  heroTitle: "Η Εταιρεία",
  heroSub: "Μετατρέπουμε τις ιδέες σε πραγματικότητα μέσα από τη σύγχρονη κατασκευή.",
  s1Tag: "01 — ΠΟΙΟΙ ΕΙΜΑΣΤΕ",
  s1Title: "Μια σύγχρονη εταιρεία κατασκευής.",
  s1Body1: "Η TOREO είναι μια σύγχρονη εταιρεία κατασκευής, αφιερωμένη στο να βοηθά ιδιώτες, startups, δημιουργούς, μηχανικούς και επιχειρήσεις να μετατρέπουν τις ιδέες τους σε πραγματικά προϊόντα.",
  s1Body2: "Μέσα από προηγμένη 3D εκτύπωση, κοπή laser, σχεδιασμό CAD και εξατομικευμένες λύσεις παραγωγής, γεφυρώνουμε την ιδέα με την πραγματική παραγωγή.",
  s1Body3: "Ο στόχος μας είναι απλός: να κάνουμε την επαγγελματική κατασκευή προσβάσιμη, αποδοτική και αξιόπιστη.",
  s2Tag: "02 — ΚΛΗΡΟΝΟΜΙΑ",
  s2Title: "Η σημασία πίσω από το όνομα TOREO.",
  s2Body1: 'Το όνομα TOREO προέρχεται από την αρχαία ελληνική λέξη «τορεύω».',
  s2Body2: "Στην αρχαία Ελλάδα η λέξη περιέγραφε την τέχνη της διαμόρφωσης, εκλέπτυνσης, χάραξης και κατεργασίας του μετάλλου με ακρίβεια και δεξιότητα. Οι αρχαίοι τεχνίτες μετέτρεπαν τις πρώτες ύλες σε αντικείμενα αξίας, λειτουργικότητας και ομορφιάς.",
  s2Body3: "Αν και η τεχνολογία έχει εξελιχθεί, η αρχή παραμένει η ίδια. Σήμερα, η TOREO συνεχίζει αυτή την παράδοση μέσα από σύγχρονες τεχνολογίες παραγωγής — συνδυάζοντας μηχανολογική γνώση, ψηφιακό σχεδιασμό και ακρίβεια για να μετατρέπουμε ιδέες σε πραγματικότητα.",
  s2Body4: "Το όνομά μας αντιπροσωπεύει τη σύνδεση μεταξύ της παραδοσιακής τέχνης και της σύγχρονης καινοτομίας.",
  s3Tag: "03 — ΤΙ ΚΑΝΟΥΜΕ",
  s3Title: "Τέσσερις δυνατότητες. Μία ροή.",
  s3c1t: "3D ΕΚΤΥΠΩΣΗ",
  s3c1d: "Γρήγορη πρωτοτυποποίηση, εξατομικευμένα εξαρτήματα, λειτουργικά μέρη, ανάπτυξη προϊόντων και μικρές παραγωγές.",
  s3c2t: "ΚΟΠΗ LASER",
  s3c2d: "Ακριβής κοπή και χάραξη για βιομηχανικές, εμπορικές και δημιουργικές εφαρμογές.",
  s3c3t: "Σχεδιασμός CAD",
  s3c3d: "Επαγγελματικός σχεδιασμός, μοντελοποίηση, βελτιστοποίηση και προετοιμασία για παραγωγή.",
  s3c4t: "Custom Manufacturing",
  s3c4d: "Ολοκληρωμένη υποστήριξη από την αξιολόγηση της ιδέας έως την τελική παραγωγή.",
  s4Tag: "04 — Γιατί TOREO",
  s4Title: "Γιατί μας επιλέγουν.",
  s4i1t: "Ακρίβεια",
  s4i1d: "Κάθε έργο προσεγγίζεται με προσοχή στη λεπτομέρεια.",
  s4i2t: "Αξιοπιστία",
  s4i2d: "Σαφής επικοινωνία και συνεπής παράδοση.",
  s4i3t: "Καινοτομία",
  s4i3d: "Σύγχρονα εργαλεία και τεχνολογίες για σύγχρονες προκλήσεις.",
  s4i4t: "Ευελιξία",
  s4i4d: "Λύσεις προσαρμοσμένες στις απαιτήσεις κάθε έργου.",
  s4i5t: "Υποστήριξη",
  s4i5d: "Καθοδήγηση σε όλη τη διάρκεια της κατασκευαστικής διαδικασίας.",
  s4i6t: "Ποιότητα",
  s4i6d: "Δέσμευση σε επαγγελματικά αποτελέσματα και συνεχή βελτίωση.",
  s5Tag: "05 — ΟΡΑΜΑ",
  s5Title: "Το όραμά μας.",
  s5Body1: "Πιστεύουμε ότι η κατασκευή πρέπει να ενδυναμώνει την καινοτομία.",
  s5Body2: "Το όραμά μας είναι να γίνουμε ένας αξιόπιστος κατασκευαστικός συνεργάτης για δημιουργούς, μηχανικούς, startups και επιχειρήσεις που αναζητούν λύσεις παραγωγής υψηλής ποιότητας.",
  s5Body3: "Συνδυάζοντας τεχνολογία, δεξιοτεχνία και επίλυση προβλημάτων, στόχος μας είναι να βοηθήσουμε στη μετατροπή των ιδεών σε επιτυχημένα προϊόντα.",
  quote: "Από τη δεξιοτεχνία του παρελθόντος, στην κατασκευή του μέλλοντος.",
  quoteTag: "Η δέσμευσή μας",
  cta: "Ξεκινήστε Έργο",
};

// Inline minimalist line icons (white strokes)
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const ICONS = {
  precision: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1 M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0",
  reliability: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z M9 12l2 2 4-4",
  innovation: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
  flexibility: "M4 7h10a4 4 0 0 1 0 8H6 M9 20l-3-3 3-3 M15 4l3 3-3 3",
  support: "M21 12a9 9 0 1 0-9 9 M15 21h6v-6 M12 8v4l3 2",
  quality: "M12 2l2.39 4.84L20 8l-4 3.9.94 5.46L12 14.77l-4.94 2.59L8 11.9 4 8l5.61-1.16z",
};

function CompanyPage() {
  const { lang } = useI18n();
  const c = lang === "GR" ? gr : en;
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("co-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    el.querySelectorAll(".co-reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [lang]);

  const services = [
    { t: c.s3c1t, d: c.s3c1d, img: printAsset.url },
    { t: c.s3c2t, d: c.s3c2d, img: laserAsset.url },
    { t: c.s3c3t, d: c.s3c3d, img: cadAsset.url },
    { t: c.s3c4t, d: c.s3c4d, img: productAsset.url },
  ];

  const values = [
    { t: c.s4i1t, d: c.s4i1d, icon: ICONS.precision },
    { t: c.s4i2t, d: c.s4i2d, icon: ICONS.reliability },
    { t: c.s4i3t, d: c.s4i3d, icon: ICONS.innovation },
    { t: c.s4i4t, d: c.s4i4d, icon: ICONS.flexibility },
    { t: c.s4i5t, d: c.s4i5d, icon: ICONS.support },
    { t: c.s4i6t, d: c.s4i6d, icon: ICONS.quality },
  ];

  return (
    <main ref={root} className="text-foreground min-h-screen" style={{ backgroundColor: "#0d1220" }}>
      <Navigation />

      <style>{`
        .co-reveal { opacity: 0; transform: translateY(28px); transition: opacity 900ms cubic-bezier(.2,.7,.2,1), transform 900ms cubic-bezier(.2,.7,.2,1); }
        .co-reveal.co-in { opacity: 1; transform: none; }
        .co-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .32em; }
        .co-rule { background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); }
        .co-grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .co-card { background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)); border: 1px solid rgba(255,255,255,.10); transition: border-color .4s ease, transform .4s ease, background .4s ease; }
        .co-card:hover { border-color: rgba(255,255,255,.28); transform: translateY(-2px); }
      `}</style>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroLaser.url}
            alt="TOREO manufacturing workshop"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,18,32,.55) 0%, rgba(13,18,32,.85) 70%, #0d1220 100%), radial-gradient(ellipse at 50% 0%, oklch(0.4 0.2 245 / 0.35), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 co-grid-bg opacity-40" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-6 md:px-12 pt-44 pb-28 md:pt-56 md:pb-40">
          <div className="co-reveal flex items-center gap-4 mb-8 max-w-md">
            <span className="co-mono text-[11px] uppercase text-primary">— Company</span>
            <div className="h-px flex-1 co-rule" />
          </div>
          <h1
            className="co-reveal font-display font-bold leading-[0.95] text-[clamp(2.8rem,8vw,6.5rem)] tracking-tighter mb-8"
            style={{ textShadow: "0 0 32px oklch(0.65 0.22 245 / 0.4)" }}
          >
            {c.heroTitle}
          </h1>
          <p className="co-reveal max-w-2xl text-lg md:text-2xl text-foreground/75 font-light leading-relaxed">
            {c.heroSub}
          </p>
        </div>
      </section>

      {/* SECTION 1 — Who We Are */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="mx-auto max-w-[1280px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-4 co-reveal">
            <div className="sticky top-32">
              <div className="flex items-center gap-4 mb-6">
                <span className="co-mono text-[11px] uppercase text-primary">{c.s1Tag}</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-tight">
                {c.s1Title}
              </h2>
            </div>
          </div>
          <div className="lg:col-span-8 co-reveal space-y-6 text-[17px] md:text-[19px] leading-[1.8] text-foreground/80 font-light">
            <p>{c.s1Body1}</p>
            <p>{c.s1Body2}</p>
            <p className="text-foreground/95 font-normal">{c.s1Body3}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="h-px co-rule" />
      </div>

      {/* SECTION 2 — Meaning behind TOREO */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 50%, oklch(0.4 0.2 245 / 0.18), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-[1280px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-5 co-reveal">
            <div className="co-mono text-[11px] uppercase text-primary mb-4">{c.s2Tag}</div>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tight mb-8">
              {c.s2Title}
            </h2>
            <div className="border border-white/15 p-8 md:p-10" style={{ background: "linear-gradient(135deg, oklch(0.15 0.02 245 / 0.4), oklch(0.08 0.01 245 / 0.25))" }}>
              <div className="co-mono text-[10px] uppercase text-foreground/50 mb-3">ΤΟΡΕΟ · TORΕΟ</div>
              <p className="font-display text-2xl md:text-3xl leading-snug italic text-foreground/95">
                "{lang === "GR" ? "Η τέχνη της μορφοποίησης με ακρίβεια." : "The art of shaping with precision."}"
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 co-reveal space-y-6 text-[17px] md:text-[18px] leading-[1.8] text-foreground/80 font-light">
            <p className="text-foreground/95 text-lg md:text-xl">{c.s2Body1}</p>
            <p>{c.s2Body2}</p>
            <p>{c.s2Body3}</p>
            <p className="text-foreground/95">{c.s2Body4}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="h-px co-rule" />
      </div>

      {/* SECTION 3 — What We Do */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="co-reveal mb-16 max-w-3xl">
            <div className="co-mono text-[11px] uppercase text-primary mb-4">{c.s3Tag}</div>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tight">
              {c.s3Title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {services.map((s, i) => (
              <article key={i} className="co-reveal co-card group overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.t}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-[1400ms] ease-out"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(13,18,32,.85) 100%)" }} />
                  <div className="absolute top-4 left-4 co-mono text-[10px] uppercase text-foreground/70">
                    0{i + 1} / 04
                  </div>
                </div>
                <div className="p-8 md:p-10">
                  <h3 className="font-display text-2xl md:text-3xl mb-4">{s.t}</h3>
                  <p className="text-foreground/70 leading-relaxed font-light">{s.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="h-px co-rule" />
      </div>

      {/* SECTION 4 — Why clients choose TOREO */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 20% 30%, oklch(0.4 0.2 245 / 0.15), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-[1280px]">
          <div className="co-reveal mb-16 max-w-3xl">
            <div className="co-mono text-[11px] uppercase text-primary mb-4">{c.s4Tag}</div>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tight">
              {c.s4Title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,.10)" }}>
            {values.map((v, i) => (
              <div
                key={i}
                className="co-reveal p-8 md:p-10 group transition-colors duration-500"
                style={{ backgroundColor: "#0d1220" }}
              >
                <div className="flex items-center justify-between mb-6 text-foreground/85 group-hover:text-primary transition-colors">
                  <span className="inline-flex items-center justify-center w-11 h-11 border border-white/15">
                    <Icon d={v.icon} />
                  </span>
                  <span className="co-mono text-[10px] uppercase text-foreground/40">0{i + 1}</span>
                </div>
                <h3 className="font-display text-xl md:text-2xl mb-3">{v.t}</h3>
                <p className="text-foreground/65 leading-relaxed font-light">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="h-px co-rule" />
      </div>

      {/* SECTION 5 — Vision */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="mx-auto max-w-[1100px] text-center co-reveal">
          <div className="co-mono text-[11px] uppercase text-primary mb-6">{c.s5Tag}</div>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tight mb-12">
            {c.s5Title}
          </h2>
          <div className="space-y-6 text-[18px] md:text-[20px] leading-[1.8] text-foreground/80 font-light max-w-3xl mx-auto">
            <p className="text-foreground/95 font-display text-2xl md:text-3xl italic">
              {c.s5Body1}
            </p>
            <p>{c.s5Body2}</p>
            <p>{c.s5Body3}</p>
          </div>
        </div>
      </section>

      {/* FINAL QUOTE */}
      <section className="relative py-32 md:py-44 px-6 md:px-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, oklch(0.4 0.2 245 / 0.25), transparent 65%)" }}
        />
        <div className="absolute inset-0 co-grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="co-reveal flex items-center justify-center gap-4 mb-12">
            <div className="h-px w-20 co-rule" />
            <span className="co-mono text-[11px] uppercase text-primary">{c.quoteTag}</span>
            <div className="h-px w-20 co-rule" />
          </div>
          <blockquote
            className="co-reveal font-display italic text-[clamp(1.8rem,5vw,4rem)] leading-[1.15] tracking-tight"
            style={{ textShadow: "0 0 32px oklch(0.65 0.22 245 / 0.35)" }}
          >
            "{c.quote}"
          </blockquote>
          <div className="co-reveal mt-12 co-mono text-[11px] uppercase text-foreground/50">— TOREO</div>

          <div className="co-reveal mt-16">
            <Link
              to="/start"
              className="inline-block co-mono text-[12px] uppercase tracking-[0.3em] border border-primary/50 px-8 py-4 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {c.cta}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
