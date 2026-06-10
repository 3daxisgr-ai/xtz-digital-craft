import { useState } from "react";
import { useI18n } from "./i18n";

type QA = { q: string; a: string };
type Category = { id: string; label: string; items: QA[] };

const EN: Category[] = [
  {
    id: "3d-printing",
    label: "3D Printing",
    items: [
      { q: "Is 3D printing only for prototypes?", a: "No. We print prototypes, functional end-use parts, custom components, and small to medium production runs." },
      { q: "Which file types do you accept?", a: ".stl, .step (.stp), or .obj. Include quantity and any surface finish requirements." },
      { q: "How big can you print?", a: "Most parts fit our build volumes; larger parts are split and bonded. Send dimensions and we'll confirm." },
    ],
  },
  {
    id: "laser-cutting",
    label: "Laser Cutting",
    items: [
      { q: "What tolerances do you hold?", a: "Typical fiber-laser tolerance is ±0.05 mm depending on material and thickness." },
      { q: "Which file types do you accept?", a: ".dxf, .dwg, or .step. Specify material, thickness and quantity." },
      { q: "What is the max thickness?", a: "Up to industrial standard for steel, stainless and aluminum. Send specs and we'll confirm." },
    ],
  },
  {
    id: "materials",
    label: "Materials",
    items: [
      { q: "Which metals do you cut?", a: "Mild steel, stainless steel, aluminum, brass. Copper on request." },
      { q: "Which polymers do you print?", a: "PLA, ABS, PETG, Nylon (PA), PC, plus TPU." },
      { q: "Can you advise on materials?", a: "Yes. Tell us the use case and environment — we'll recommend." },
    ],
  },
  {
    id: "lead-times",
    label: "Lead Times",
    items: [
      { q: "How fast are you create a prototype?", a: "Most 3D-printed prototypes ship in a few days. Metal prototypes typically within one to two weeks." },
      { q: "How fast is production?", a: "Depends on volume and material. We provide a clear timeline with every quote." },
    ],
  },
  {
    id: "prototyping",
    label: "Prototyping",
    items: [
      { q: "Do I need a finished design first?", a: "No. We can start from a sketch or idea and develop it into a manufacturable design." },
      { q: "Can we iterate?", a: "Yes — design → prototype → adjust → reprint is our standard loop." },
    ],
  },
  {
    id: "production",
    label: "Production",
    items: [
      { q: "Can you do large volumes?", a: "Yes. For larger volumes we use our network of trusted manufacturing partners." },
      { q: "Will quality be consistent?", a: "Every batch is inspected against the approved sample and drawings." },
    ],
  },
  {
    id: "pricing",
    label: "Pricing Process",
    items: [
      { q: "How do I get a quote?", a: "Send the inquiry form. An engineer reviews every request and replies within one business day." },
      { q: "Is quoting automatic?", a: "No. Every quote is reviewed manually so we can advise on the best approach." },
    ],
  },
  {
    id: "files",
    label: "File Requirements",
    items: [
      { q: "Which formats do you accept?", a: "CAD: .step, .stp, .iges, .stl, .obj, .dxf, .dwg. References: .pdf, .jpg, .png." },
      { q: "What should I include?", a: "Quantity, material, thickness (for sheet), surface finish and any tolerance critical to function." },
    ],
  },
];

const GR: Category[] = [
  {
    id: "3d-printing",
    label: "3D Εκτύπωση",
    items: [
      { q: "Η 3D εκτύπωση είναι μόνο για πρωτότυπα;", a: "Όχι. Εκτυπώνουμε πρωτότυπα, λειτουργικά εξαρτήματα, custom components και μικρές–μεσαίες παραγωγές." },
      { q: "Τι αρχεία δέχεστε;", a: ".stl, .step (.stp) ή .obj. Συμπεριλάβετε ποσότητα και απαιτήσεις φινιρίσματος." },
    ],
  },
  {
    id: "laser-cutting",
    label: "Κοπή Laser",
    items: [
      { q: "​Τι επίπεδο ακρίβειας προσφέρουμε;", a: "Τυπικά ±0.05 mm ανάλογα με υλικό και πάχος." },
      { q: "Τι αρχεία δέχεστε;", a: ".dxf, .dwg ή .step. Δηλώστε υλικό, πάχος και ποσότητα." },
    ],
  },
  {
    id: "materials",
    label: "Υλικά",
    items: [
      { q: "Σε ποια μέταλλα κόβετε;", a: "Χάλυβα, ανοξείδωτο, αλουμίνιο, ορείχαλκο. Χαλκό κατόπιν συνεννόησης." },
      { q: "Ποια πολυμερή εκτυπώνετε;", a: "PLA, ABS, PETG, PA (Nylon), PC και TPU." },
    ],
  },
  {
    id: "lead-times",
    label: "Χρόνοι Παράδοσης",
    items: [
      { q: "Πόσο γρήγορα  δημιουργείτε τα πρωτότυπα;", a: "Συνήθως λίγες ημέρες για 3D printed, 1–2 εβδομάδες για μεταλλικά." },
      { q: "Πόσο γρήγορη ειναι η παραγωγή;", a: "Εξαρτάται από όγκο και υλικό. Δίνουμε σαφές χρονοδιάγραμμα με κάθε προσφορά." },
    ],
  },
  {
    id: "prototyping",
    label: "Πρωτοτυποποίηση",
    items: [
      { q: "Πρέπει να έχω έτοιμο σχέδιο;", a: "Όχι. Ξεκινάμε από ιδέα ή σκίτσο και το αναπτύσσουμε σε κατασκευάσιμο." },
    ],
  },
  {
    id: "production",
    label: "Παραγωγή",
    items: [
      { q: "Υποστηρίζετε μεγάλους όγκους;", a: "Ναι, μέσω του δικτύου αξιόπιστων κατασκευαστικών συνεργατών." },
    ],
  },
  {
    id: "pricing",
    label: "Προσφορά",
    items: [
      { q: "Πώς λαμβάνω προσφορά;", a: "Στείλτε τη φόρμα αιτήματος. Μηχανικός απαντά εντός μίας εργάσιμης." },
    ],
  },
  {
    id: "files",
    label: "Αρχεία",
    items: [
      { q: "Τι αρχεία δέχεστε;", a: "CAD: .step, .stp, .iges, .stl, .obj, .dxf, .dwg. Reference: .pdf, .jpg, .png." },
    ],
  },
];

export function FAQ() {
  const { lang } = useI18n();
  const cats = lang === "GR" ? GR : EN;
  const [openKey, setOpenKey] = useState<string | null>(`${cats[0].id}-0`);

  return (
    <section id="faq" className="relative w-full overflow-hidden inox-surface py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.2 245 / 0.2), transparent 60%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        {cats.map((cat) => (
          <div key={cat.id} className="mb-14 last:mb-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-5">
              {cat.label}
            </div>
            <div className="space-y-3">
              {cat.items.map((item, i) => {
                const key = `${cat.id}-${i}`;
                const isOpen = openKey === key;
                return (
                  <div
                    key={key}
                    className="border border-primary/15 hover:border-primary/40 transition-colors"
                    style={{ background: "linear-gradient(135deg, oklch(0.15 0.02 245 / 0.4), oklch(0.08 0.01 245 / 0.25))" }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenKey(isOpen ? null : key)}
                      className="w-full flex items-center justify-between gap-6 px-5 md:px-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-display text-base md:text-lg font-medium text-foreground">
                        {item.q}
                      </span>
                      <span
                        className={`relative shrink-0 w-7 h-7 grid place-items-center border border-primary/40 transition-all ${
                          isOpen ? "bg-primary text-primary-foreground rotate-45" : "text-primary"
                        }`}
                        aria-hidden
                      >
                        <span className="absolute h-[1px] w-3 bg-current" />
                        <span className="absolute w-[1px] h-3 bg-current" />
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 md:px-6 pb-6 text-foreground/75 leading-relaxed font-light">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
