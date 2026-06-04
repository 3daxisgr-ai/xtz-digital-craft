import { useState } from "react";
import { useI18n } from "./i18n";

type QA = { q: string; a: string };

const EN: QA[] = [
  { q: "Do I need a finished design before contacting you?", a: "No. If you only have an idea, our team can help develop it into a manufacturable product — from sketch to engineered CAD." },
  { q: "Is 3D printing only for prototypes?", a: "No. We use 3D printing for rapid prototypes, functional parts, custom components, and small to medium production runs." },
  { q: "Can you help develop my idea?", a: "Yes. Our engineers work alongside you from concept and feasibility through design, prototype and final manufacturing." },
  { q: "Can you support larger production volumes?", a: "Yes. For projects requiring large-scale production, we activate our trusted global manufacturing partners to scale from prototype to series production." },
  { q: "What materials do you work with?", a: "Stainless Steel, Aluminum, Acrylic and Engineering Plastics — plus custom materials specified per application." },
  { q: "Can I request only manufacturing?", a: "Yes. We can manufacture directly from customer-provided files and designs." },
  { q: "Can I request a complete project from design to production?", a: "Yes. We handle the entire process — Design, Prototype, Manufacture and Deliver — under one engineering team." },
  { q: "How do I get a quote?", a: "Submit the project inquiry form. Every request is reviewed manually by an engineer, who responds with a tailored quotation." },
];

const GR: QA[] = [
  { q: "Χρειάζεται να έχω έτοιμο σχέδιο πριν επικοινωνήσω;", a: "Όχι. Αν έχετε μόνο μια ιδέα, η ομάδα μας θα τη μετατρέψει σε μηχανολογικό σχέδιο και κατασκευάσιμο προϊόν." },
  { q: "Η 3D εκτύπωση είναι μόνο για πρωτότυπα;", a: "Όχι. Χρησιμοποιούμε 3D εκτύπωση για ταχέα πρωτότυπα, λειτουργικά εξαρτήματα, custom components και μικρές ή μεσαίες παραγωγές." },
  { q: "Μπορείτε να αναπτύξετε την ιδέα μου;", a: "Ναι. Οι μηχανικοί μας σας συνοδεύουν από την ιδέα και τη μελέτη εφικτότητας έως τον σχεδιασμό, το πρωτότυπο και την τελική κατασκευή." },
  { q: "Υποστηρίζετε μεγαλύτερους όγκους παραγωγής;", a: "Ναι. Για έργα μεγάλης κλίμακας ενεργοποιούμε το διεθνές δίκτυο αξιόπιστων κατασκευαστικών συνεργατών μας." },
  { q: "Με ποια υλικά δουλεύετε;", a: "Ανοξείδωτο ατσάλι, αλουμίνιο, ακρυλικό και τεχνικά πλαστικά — καθώς και custom υλικά ανά εφαρμογή." },
  { q: "Μπορώ να ζητήσω μόνο κατασκευή;", a: "Ναι. Κατασκευάζουμε απευθείας από αρχεία και σχέδια που παρέχει ο πελάτης." },
  { q: "Μπορώ να ζητήσω ολοκληρωμένο έργο από τον σχεδιασμό μέχρι την παραγωγή;", a: "Ναι. Αναλαμβάνουμε όλη τη διαδικασία — Σχεδιασμό, Πρωτότυπο, Κατασκευή και Παράδοση." },
  { q: "Πώς λαμβάνω προσφορά;", a: "Συμπληρώστε τη φόρμα αιτήματος. Κάθε αίτημα ελέγχεται χειροκίνητα από μηχανικό, ο οποίος επιστρέφει με εξατομικευμένη προσφορά." },
];

export function FAQ() {
  const { lang } = useI18n();
  const items = lang === "GR" ? GR : EN;
  const [open, setOpen] = useState<number | null>(0);

  const title = lang === "GR" ? "Συχνές Ερωτήσεις" : "Frequently Asked Questions";
  const sub = lang === "GR"
    ? "Όλα όσα χρειάζεται να γνωρίζετε πριν ξεκινήσετε ένα έργο με την 3D Axis."
    : "Everything you need to know before starting your project with 3D Axis.";
  const kicker = lang === "GR" ? "08 / FAQ" : "08 / FAQ";

  return (
    <section id="faq" className="relative w-full overflow-hidden bg-black py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 brushed-metal opacity-20" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.2 245 / 0.25), transparent 60%)" }}
        />
      </div>

      <span className="absolute top-10 left-6 md:left-10 font-mono text-[10px] tracking-[0.4em] text-primary/60">
        {kicker}
      </span>

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {lang === "GR" ? "Πληροφορίες" : "Information"}
          </div>
          <h2 className="font-display font-bold tracking-tighter text-[clamp(2rem,5.5vw,4.5rem)] leading-[0.95] text-glow">
            {title}
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-foreground/70 font-light">
            {sub}
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="glass-panel border border-primary/15 backdrop-blur-md transition-all duration-300 hover:border-primary/40"
                style={{
                  background: "linear-gradient(135deg, oklch(0.15 0.02 245 / 0.5), oklch(0.08 0.01 245 / 0.3))",
                  boxShadow: isOpen ? "0 0 40px oklch(0.55 0.22 245 / 0.15), inset 0 1px 0 oklch(1 0 0 / 0.04)" : "inset 0 1px 0 oklch(1 0 0 / 0.04)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 px-6 md:px-8 py-6 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <span className="font-mono text-[10px] tracking-[0.3em] text-primary/70 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-base md:text-xl font-medium text-foreground">
                      {item.q}
                    </span>
                  </div>
                  <span
                    className={`relative shrink-0 w-8 h-8 grid place-items-center border border-primary/40 transition-all ${
                      isOpen ? "bg-primary text-primary-foreground rotate-45" : "text-primary"
                    }`}
                    aria-hidden
                  >
                    <span className="absolute h-[1px] w-3 bg-current" />
                    <span className="absolute w-[1px] h-3 bg-current" />
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-500 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 md:px-8 pb-7 pl-[3.75rem] md:pl-[4.5rem] text-foreground/75 leading-relaxed font-light">
                      <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent mb-5" />
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
