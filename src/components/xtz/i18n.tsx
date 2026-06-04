import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "EN" | "GR";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.intro": "00 / Intro",
  "nav.idea": "01 / Idea",
  "nav.design": "02 / Design",
  "nav.prototype": "03 / Prototype",
  "nav.manufacture": "04 / Manufacture",
  "nav.portfolio": "05 / Capabilities",
  "nav.process": "06 / Process",
  "nav.inquiry": "07 / Inquiry",
  "nav.cta": "Start Project",

  "intro.kicker": "​",
  "intro.brand": "3D AXIS",
  "intro.slogan": "Precision is not what we do. It's who we are.",
  "intro.xyz": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",
  "intro.scroll": "Scroll to enter",

  "ch.idea.k": "Idea",
  "ch.idea.t": "Every great creation begins as a set of coordinates.",
  "ch.idea.d": "We translate ambition into geometry. Engineering consultation, feasibility, material studies — the disciplined start that protects every milestone after it.",

  "ch.design.k": "Design",
  "ch.design.t": "Designed in digital space. Built in the real world.",
  "ch.design.d": "Parametric CAD, generative geometry and DFM-ready files. Your idea becomes a precision dataset before a single sheet is cut.",

  "ch.proto.k": "Prototype",
  "ch.proto.t": "Iterate at the speed of thought.",
  "ch.proto.d": "Industrial 3D printing, rapid metal prototypes, validation parts. Hold the next version in your hands within days, not quarters.",

  "ch.mfg.k": "Manufacture",
  "ch.mfg.t": "Precision without compromise.",
  "ch.mfg.d": "Fiber laser cutting, engraving, press brake forming, welding and finishing — under one roof, to ±0.05mm tolerances.",

  "portfolio.kicker": "Capabilities",
  "portfolio.title": "Examples of products, components and manufacturing solutions that can be developed through the 3D AXIS workflow.",

  "process.kicker": "The Journey",
  "process.title": "From idea to delivery.",
  "p.idea.t": "Idea",
  "p.idea.d": "Discovery, feasibility, material exploration.",
  "p.design.t": "Design",
  "p.design.d": "CAD, simulation, DFM, generative geometry.",
  "p.proto.t": "Prototype",
  "p.proto.d": "3D printing and rapid metal validation parts.",
  "p.mfg.t": "Manufacture",
  "p.mfg.d": "Laser, press brake, welding, finishing.",
  "p.deliver.t": "Deliver",
  "p.deliver.d": "White-glove logistics. Installed where it lives.",

  "inquiry.kicker": "Project Inquiry",
  "inquiry.title": "Start your project.",
  "inquiry.intro": "Tell us about your concept. Every inquiry is reviewed by an engineer.",
  "f.name": "Name",
  "f.surname": "Surname",
  "f.email": "Email",
  "f.phone": "Phone",
  "f.company": "Company (optional)",
  "f.service": "Service Needed",
  "f.material": "Material",
  "f.stage": "What stage is your project?",
  "f.dimensions": "Dimensions",
  "f.quantity": "Quantity",
  "f.upload": "Upload Reference / Files",
  "f.help1": "I don't have a design yet.",
  "f.help2": "I need help developing my idea.",
  "f.desc": "Project Description",
  "f.desc.ph": "Describe your concept, application, environment, deadlines…",
  "f.submit": "Submit Inquiry",
  "f.sent": "Inquiry received. Our engineers will respond within one business day.",
  "f.select": "Select…",

  "finale.kicker": "End of Reel",
  "finale.statement": "Precision is not what we do. It's who we are.",
  "finale.cta": "Start Your Project",
  "finale.foot1": "© 3D AXIS",
  "finale.foot2": "​",
  "finale.foot3": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",
};

const gr: Dict = {
  "nav.intro": "00 / Εισαγωγή",
  "nav.idea": "01 / Ιδέα",
  "nav.design": "02 / Σχεδιασμός",
  "nav.prototype": "03 / Πρωτότυπο",
  "nav.manufacture": "04 / Κατασκευή",
  "nav.portfolio": "05 / Δυνατότητες",
  "nav.process": "06 / Διαδικασία",
  "nav.inquiry": "07 / Αίτημα",
  "nav.cta": "Ξεκίνα Έργο",

  "intro.kicker": "​",
  "intro.brand": "3D AXIS",
  "intro.slogan": "Η ακρίβεια δεν είναι αυτό που κάνουμε. Είναι αυτό που είμαστε.",
  "intro.xyz": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",
  "intro.scroll": "Κύλιση για είσοδο",

  "ch.idea.k": "Ιδέα",
  "ch.idea.t": "Κάθε σπουδαία δημιουργία ξεκινά ως ένα σύνολο συντεταγμένων.",
  "ch.idea.d": "Μεταφράζουμε τη φιλοδοξία σε γεωμετρία. Μηχανική μελέτη, εφικτότητα και επιλογή υλικών — μια πειθαρχημένη αρχή που προστατεύει κάθε επόμενο βήμα.",

  "ch.design.k": "Σχεδιασμός",
  "ch.design.t": "Σχεδιασμένο στον ψηφιακό χώρο. Φτιαγμένο στον πραγματικό κόσμο.",
  "ch.design.d": "Παραμετρικό CAD, generative γεωμετρία και αρχεία έτοιμα για παραγωγή. Η ιδέα σας γίνεται ακριβές dataset πριν κοπεί το πρώτο φύλλο.",

  "ch.proto.k": "Πρωτότυπο",
  "ch.proto.t": "Επαναλάβετε στην ταχύτητα της σκέψης.",
  "ch.proto.d": "Βιομηχανική 3D εκτύπωση και ταχέα μεταλλικά πρωτότυπα. Κρατήστε την επόμενη έκδοση σε μέρες, όχι μήνες.",

  "ch.mfg.k": "Κατασκευή",
  "ch.mfg.t": "Ακρίβεια χωρίς συμβιβασμούς.",
  "ch.mfg.d": "Κοπή laser, χάραξη, στραντζάρισμα, συγκολλήσεις και φινίρισμα — όλα κάτω από μία στέγη, με ανοχές ±0.05mm.",

  "portfolio.kicker": "Δυνατότητες",
  "portfolio.title": "Παραδείγματα προϊόντων, εξαρτημάτων και λύσεων κατασκευής που μπορούν να αναπτυχθούν μέσω της διαδικασίας 3D AXIS.",

  "process.kicker": "Η Διαδρομή",
  "process.title": "Από την ιδέα στην παράδοση.",
  "p.idea.t": "Ιδέα",
  "p.idea.d": "Ανακάλυψη, εφικτότητα, επιλογή υλικών.",
  "p.design.t": "Σχεδιασμός",
  "p.design.d": "CAD, προσομοίωση, DFM, generative γεωμετρία.",
  "p.proto.t": "Πρωτότυπο",
  "p.proto.d": "3D εκτύπωση και ταχέα μεταλλικά prototypes.",
  "p.mfg.t": "Κατασκευή",
  "p.mfg.d": "Laser, στραντζάρισμα, συγκολλήσεις, φινίρισμα.",
  "p.deliver.t": "Παράδοση",
  "p.deliver.d": "White-glove logistics. Εγκατάσταση στο χώρο σας.",

  "inquiry.kicker": "Αίτημα Έργου",
  "inquiry.title": "Ξεκινήστε το έργο σας.",
  "inquiry.intro": "Πείτε μας για την ιδέα σας. Κάθε αίτημα ελέγχεται από μηχανικό.",
  "f.name": "Όνομα",
  "f.surname": "Επώνυμο",
  "f.email": "Email",
  "f.phone": "Τηλέφωνο",
  "f.company": "Εταιρεία (προαιρετικό)",
  "f.service": "Υπηρεσία",
  "f.material": "Υλικό",
  "f.stage": "Σε ποιο στάδιο είναι το έργο;",
  "f.dimensions": "Διαστάσεις",
  "f.quantity": "Ποσότητα",
  "f.upload": "Επισύναψη αρχείων",
  "f.help1": "Δεν έχω σχέδιο ακόμα.",
  "f.help2": "Χρειάζομαι βοήθεια στην ανάπτυξη της ιδέας.",
  "f.desc": "Περιγραφή Έργου",
  "f.desc.ph": "Περιγράψτε την ιδέα, την εφαρμογή, το περιβάλλον, τα χρονοδιαγράμματα…",
  "f.submit": "Αποστολή Αιτήματος",
  "f.sent": "Το αίτημά σας ελήφθη. Οι μηχανικοί μας θα απαντήσουν εντός μίας εργάσιμης.",
  "f.select": "Επιλέξτε…",

  "finale.kicker": "Τέλος",
  "finale.statement": "Η ακρίβεια δεν είναι αυτό που κάνουμε. Είναι αυτό που είμαστε.",
  "finale.cta": "Ξεκινήστε το Έργο σας",
  "finale.foot1": "© 3D AXIS",
  "finale.foot2": "​",
  "finale.foot3": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",
};

const dicts: Record<Lang, Dict> = { EN: en, GR: gr };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "EN",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("EN");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("axis-lang") as Lang | null;
      if (saved === "EN" || saved === "GR") setLang(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("axis-lang", lang); } catch {}
  }, [lang]);
  const t = (k: string) => dicts[lang][k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
