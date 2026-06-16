import { useEffect, useRef } from "react";
import { useI18n } from "./i18n";
import cadAsset from "@/assets/cad-workshop.png.asset.json";
import printAsset from "@/assets/bambu-3d-printing.png.asset.json";
import laserAsset from "@/assets/akj-laser-cutting.jpg.asset.json";
import productAsset from "@/assets/design-prototype-photo.png.asset.json";

const en = {
  eyebrow: "Why TOREO",
  title1: "Built on Craftsmanship.",
  title2: "Driven by Innovation.",
  introLead:
    'The name TOREO originates from the ancient Greek word "τορεύω" (torevo) — the art of shaping and refining metal through skill, precision and craftsmanship.',
  introBody1:
    "For centuries, craftsmen transformed raw materials into tools, structures and creations that served a purpose. While technology has evolved dramatically, the essence of manufacturing remains unchanged: turning an idea into something real.",
  introBody2:
    "At TOREO, we carry that same mindset into the modern era through advanced digital manufacturing technologies, combining engineering expertise with precision production.",
  b1Tag: "01 — Purpose",
  b1Title: "More Than Manufacturing",
  b1Lead: "We do not simply produce parts.",
  b1Body:
    "We help individuals, startups, engineers, creators and businesses transform concepts into physical products. Whether a project starts as a sketch, an idea, or a technical design, our goal is to guide it from concept to reality with clarity and efficiency.",
  b2Tag: "02 — Approach",
  b2Title: "Built Around Problem Solving",
  b2Lead: "Every project is different.",
  b2Body:
    "Rather than offering one-size-fits-all solutions, we work closely with clients to understand the challenge, evaluate the best manufacturing approach and deliver practical results that meet real-world requirements. Our focus is not only on production but on helping customers make better manufacturing decisions.",
  b3Tag: "03 — Standard",
  b3Title: "Precision You Can Trust",
  b3Lead: "Modern manufacturing requires more than equipment.",
  b3Body:
    "It requires attention to detail, technical knowledge, consistency and accountability. Through advanced 3D printing, laser cutting, CAD design and custom manufacturing workflows, we deliver reliable results that customers can confidently build upon.",
  b4Tag: "04 — Partnership",
  b4Title: "Growing Together",
  b4Lead: "We believe the best partnerships are long-term.",
  b4Body:
    "Our success is measured by the success of the people and businesses we support. Every prototype, custom part, product launch or manufacturing project represents an opportunity to create something valuable together.",
  quote: "From the craftsmanship of the past to the manufacturing of the future.",
  caption1: "CAD & Engineering",
  caption2: "Additive Manufacturing",
  caption3: "Fiber Laser Cutting",
  caption4: "Finished Products",
};

const gr: typeof en = {
  eyebrow: "Γιατί TOREO",
  title1: "Χτισμένο πάνω στη Δεξιοτεχνία.",
  title2: "Καθοδηγούμενο από την Καινοτομία.",
  introLead:
    'Το όνομα TOREO προέρχεται από την αρχαία ελληνική λέξη «τορεύω» — την τέχνη της διαμόρφωσης και της εκλέπτυνσης του μετάλλου μέσα από δεξιότητα, ακρίβεια και μαστοριά.',
  introBody1:
    "Για αιώνες, οι τεχνίτες μετέτρεπαν πρώτες ύλες σε εργαλεία, κατασκευές και δημιουργίες με σκοπό. Παρότι η τεχνολογία έχει εξελιχθεί δραματικά, η ουσία της κατασκευής παραμένει η ίδια: η μετατροπή μιας ιδέας σε κάτι πραγματικό.",
  introBody2:
    "Στην TOREO μεταφέρουμε την ίδια νοοτροπία στη σύγχρονη εποχή, μέσα από προηγμένες ψηφιακές τεχνολογίες κατασκευής, συνδυάζοντας μηχανολογική εξειδίκευση με ακρίβεια στην παραγωγή.",
  b1Tag: "01 — Σκοπός",
  b1Title: "Πέρα από την Κατασκευή",
  b1Lead: "Δεν παράγουμε απλώς εξαρτήματα.",
  b1Body:
    "Βοηθάμε ιδιώτες, startups, μηχανικούς, δημιουργούς και επιχειρήσεις να μετατρέψουν ιδέες σε πραγματικά προϊόντα. Είτε το έργο ξεκινά ως σκίτσο, ιδέα ή τεχνικό σχέδιο, ο στόχος μας είναι να το οδηγήσουμε από την ιδέα στην πραγματικότητα με σαφήνεια και αποτελεσματικότητα.",
  b2Tag: "02 — Προσέγγιση",
  b2Title: "Με Επίκεντρο την Επίλυση Προβλημάτων",
  b2Lead: "Κάθε έργο είναι διαφορετικό.",
  b2Body:
    "Αντί για έτοιμες λύσεις, συνεργαζόμαστε στενά με τους πελάτες για να κατανοήσουμε την πρόκληση, να αξιολογήσουμε την καλύτερη μέθοδο και να παραδώσουμε πρακτικά αποτελέσματα. Δεν εστιάζουμε μόνο στην παραγωγή, αλλά και στο να βοηθάμε τους πελάτες να παίρνουν καλύτερες κατασκευαστικές αποφάσεις.",
  b3Tag: "03 — Ποιότητα",
  b3Title: "Ακρίβεια που Εμπιστεύεστε",
  b3Lead: "Η σύγχρονη κατασκευή απαιτεί περισσότερα από εξοπλισμό.",
  b3Body:
    "Απαιτεί προσοχή στη λεπτομέρεια, τεχνική γνώση, συνέπεια και υπευθυνότητα. Μέσα από προηγμένη 3D εκτύπωση, κοπή laser, σχεδιασμό CAD και εξατομικευμένες ροές παραγωγής, παραδίδουμε αξιόπιστα αποτελέσματα.",
  b4Tag: "04 — Συνεργασία",
  b4Title: "Μεγαλώνουμε Μαζί",
  b4Lead: "Πιστεύουμε στις μακροχρόνιες συνεργασίες.",
  b4Body:
    "Η επιτυχία μας μετριέται από την επιτυχία των ανθρώπων και των επιχειρήσεων που υποστηρίζουμε. Κάθε πρωτότυπο, ειδικό εξάρτημα ή έργο παραγωγής είναι μια ευκαιρία να δημιουργήσουμε κάτι αξιόλογο μαζί.",
  quote: "Από τη δεξιοτεχνία του παρελθόντος, στην κατασκευή του μέλλοντος.",
  caption1: "CAD & Μελέτη",
  caption2: "Προσθετική Κατασκευή",
  caption3: "Κοπή Fiber Laser",
  caption4: "Τελικά Προϊόντα",
};

export function WhyToreo() {
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
            e.target.classList.add("wt-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18 },
    );
    el.querySelectorAll(".wt-reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [lang]);

  const blocks = [
    { tag: c.b1Tag, title: c.b1Title, lead: c.b1Lead, body: c.b1Body, img: cadAsset.url, cap: c.caption1 },
    { tag: c.b2Tag, title: c.b2Title, lead: c.b2Lead, body: c.b2Body, img: printAsset.url, cap: c.caption2 },
    { tag: c.b3Tag, title: c.b3Title, lead: c.b3Lead, body: c.b3Body, img: laserAsset.url, cap: c.caption3 },
    { tag: c.b4Tag, title: c.b4Title, lead: c.b4Lead, body: c.b4Body, img: productAsset.url, cap: c.caption4 },
  ];

  return (
    <section
      ref={root}
      aria-labelledby="why-toreo-title"
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 85% -10%, #f6ead6 0%, transparent 60%), radial-gradient(900px 500px at -10% 30%, #efe6d9 0%, transparent 55%), linear-gradient(180deg, #faf7f1 0%, #f3ece0 100%)",
        color: "#1b1a17",
      }}
    >
      <style>{`
        .wt-reveal { opacity: 0; transform: translateY(28px); transition: opacity 900ms cubic-bezier(.2,.7,.2,1), transform 900ms cubic-bezier(.2,.7,.2,1); }
        .wt-reveal.wt-in { opacity: 1; transform: none; }
        .wt-serif { font-family: 'Instrument Serif','Cormorant Garamond', Georgia, serif; }
        .wt-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .14em; }
        .wt-rule { background: linear-gradient(90deg, transparent, rgba(120,86,40,.55), transparent); }
        .wt-metal { background: linear-gradient(135deg, #b8893f 0%, #e6c98a 35%, #8a5e22 70%, #d9b56a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .wt-card { background: linear-gradient(180deg, rgba(255,253,247,.85) 0%, rgba(247,239,224,.65) 100%); border: 1px solid rgba(120,86,40,.18); backdrop-filter: blur(6px); }
        .wt-num { font-family: 'Instrument Serif', serif; }
        .wt-img-frame { box-shadow: 0 30px 60px -30px rgba(82,55,12,.35), 0 2px 0 rgba(255,255,255,.6) inset; }
        .wt-grid-bg {
          background-image:
            linear-gradient(rgba(120,86,40,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120,86,40,.07) 1px, transparent 1px);
          background-size: 56px 56px;
        }
      `}</style>

      {/* subtle grid overlay */}
      <div aria-hidden className="absolute inset-0 wt-grid-bg opacity-60 pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32">
        {/* Header */}
        <div className="wt-reveal flex items-center gap-4 mb-10">
          <span className="wt-mono text-[11px] uppercase" style={{ color: "#8a5e22" }}>
            — {c.eyebrow}
          </span>
          <div className="h-px flex-1 wt-rule" />
        </div>

        <h2
          id="why-toreo-title"
          className="wt-reveal wt-serif text-[44px] md:text-[68px] lg:text-[84px] leading-[0.98] tracking-tight max-w-5xl"
        >
          <span className="block">{c.title1}</span>
          <span className="block wt-metal italic">{c.title2}</span>
        </h2>

        {/* Intro */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5 wt-reveal">
            <div className="sticky top-24">
              <div className="wt-mono text-[10px] uppercase mb-4" style={{ color: "#8a5e22" }}>
                τορεύω · torevo
              </div>
              <p className="wt-serif text-3xl md:text-4xl leading-[1.15]" style={{ color: "#2a2620" }}>
                {c.introLead}
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6 wt-reveal">
            <p className="text-[17px] md:text-[18px] leading-[1.75]" style={{ color: "#3d362c" }}>
              {c.introBody1}
            </p>
            <p className="text-[17px] md:text-[18px] leading-[1.75]" style={{ color: "#3d362c" }}>
              {c.introBody2}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px w-16 wt-rule" />
              <span className="wt-mono text-[11px] uppercase" style={{ color: "#8a5e22" }}>
                Est. heritage · modern craft
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="wt-reveal my-24 md:my-32 h-px wt-rule" />

        {/* Blocks – timeline */}
        <div className="relative">
          {/* vertical timeline rail */}
          <div
            aria-hidden
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: "linear-gradient(180deg, transparent, rgba(120,86,40,.35), transparent)" }}
          />

          <div className="space-y-24 md:space-y-32">
            {blocks.map((b, i) => {
              const reverse = i % 2 === 1;
              return (
                <article
                  key={i}
                  className={`wt-reveal grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center ${
                    reverse ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  {/* Text */}
                  <div className="lg:col-span-6">
                    <div className="flex items-baseline gap-4 mb-5">
                      <span className="wt-num text-5xl md:text-6xl wt-metal leading-none">
                        0{i + 1}
                      </span>
                      <span className="wt-mono text-[11px] uppercase" style={{ color: "#8a5e22" }}>
                        {b.tag.split("—")[1]?.trim()}
                      </span>
                    </div>
                    <h3 className="wt-serif text-3xl md:text-5xl leading-[1.05] mb-5 tracking-tight">
                      {b.title}
                    </h3>
                    <p className="wt-serif italic text-xl md:text-2xl mb-5" style={{ color: "#5a4a32" }}>
                      {b.lead}
                    </p>
                    <p className="text-[16px] md:text-[17px] leading-[1.75]" style={{ color: "#3d362c" }}>
                      {b.body}
                    </p>
                  </div>

                  {/* Image */}
                  <div className="lg:col-span-6">
                    <div className="relative wt-card rounded-2xl p-3 wt-img-frame">
                      <div className="relative overflow-hidden rounded-xl aspect-[5/4]">
                        <img
                          src={b.img}
                          alt={b.cap}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out hover:scale-[1.04]"
                        />
                        <div
                          aria-hidden
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(180deg, transparent 55%, rgba(35,25,10,.55) 100%)",
                          }}
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                          <span className="wt-mono text-[10px] uppercase text-white/90">
                            {b.cap}
                          </span>
                          <span className="wt-mono text-[10px] uppercase text-white/70">
                            0{i + 1} / 04
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Final quote */}
        <div className="wt-reveal mt-28 md:mt-40 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 wt-rule" />
            <span className="wt-mono text-[11px] uppercase" style={{ color: "#8a5e22" }}>
              Our promise
            </span>
            <div className="h-px w-16 wt-rule" />
          </div>
          <blockquote className="wt-serif italic text-3xl md:text-5xl leading-[1.15] tracking-tight">
            <span className="wt-metal">“</span>
            {c.quote}
            <span className="wt-metal">”</span>
          </blockquote>
          <div className="mt-8 wt-mono text-[11px] uppercase" style={{ color: "#8a5e22" }}>
            — TOREO
          </div>
        </div>
      </div>
    </section>
  );
}
