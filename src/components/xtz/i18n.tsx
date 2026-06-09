import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "EN" | "GR";

type Dict = Record<string, string>;

const en: Dict = {
  // Navigation
  "nav.intro": "Home",
  "nav.capabilities": "Capabilities",
  "nav.process": "Process",
  "nav.work": "Work",
  "nav.faq": "FAQ",
  "nav.forum": "Forum",
  "nav.inquiry": "Start a Project",
  "nav.cta": "Start a Project",

  // Hero
  "intro.headline": "​SKG3D",
  "intro.sub": "​",
  "intro.scroll": "Scroll Down",
  "intro.xyz": "DESIGN · PROTOTYPE · MANUFACTURE · MASS PRODUCTION",

  // Concept (what we do)
  "concept.kicker": "What we do",
  "concept.title": "We design, prototype and build real products.",
  "concept.body": "Send us your idea, sketch or CAD file. We engineer it, prototype it, and manufacture the final part — fast.",
  "concept.cta": "Start a Project",

  // Capabilities
  "cap.kicker": "Capabilities",
  "cap.title": "Six things we do well.",
  "cap.body": "Click any capability to see materials, tolerances and how to send your files.",
  "cap.cta": "View capability",

  "cap.01.t": "Design & Development",
  "cap.01.d": "We turn ideas into manufacturable CAD.",
  "cap.02.t": "Fiber Laser Cutting",
  "cap.02.d": "Precision cuts in steel, aluminum and stainless.",
  "cap.03.t": "Sheet Metal Forming & Welding",
  "cap.03.d": "Bending, welding and assembly of metal parts.",
  "cap.04.t": "3D Printing",
  "cap.04.d": "Functional parts and small production runs.",
  "cap.05.t": "Design → Prototype",
  "cap.05.d": "From sketch to working prototype in days.",
  "cap.06.t": "​Mass production",
  "cap.06.d": "Scale to series production with trusted partners.",

  // Chapters (kept names, simpler copy)
  "ch.idea.k": "Step 1",
  "ch.idea.t": "Send us your idea.",
  "ch.idea.d": "A sketch, a photo, or a CAD file. If you don't have one, we'll help you make one.",

  "ch.design.k": "Step 2",
  "ch.design.t": "We design it.",
  "ch.design.d": "Our engineers turn your idea into a precise, manufacturable file.",

  "ch.proto.k": "Step 3",
  "ch.proto.t": "We prototype it.",
  "ch.proto.d": "Hold a working version in your hands within days — not months.",

  "ch.mfg.k": "Step 4",
  "ch.mfg.t": "We manufacture.",
  "ch.mfg.d": "Laser cutting, forming, welding, 3D printing — finished and shipped to you.",

  // Portfolio
  "portfolio.kicker": "Work",
  "portfolio.title": "Examples of products and parts built through the SKG3D workflow.",

  // Process
  "process.kicker": "Process",
  "process.title": "How it works.",
  "p.idea.t": "Idea",
  "p.idea.d": "Send us a sketch, file or description.",
  "p.design.t": "Design",
  "p.design.d": "We engineer a manufacturable CAD file.",
  "p.proto.t": "Prototype",
  "p.proto.d": "Working sample, fast.",
  "p.mfg.t": "Manufacture",
  "p.mfg.d": "Laser, forming, welding, 3D printing.",
  "p.deliver.t": "Mass Production",
  "p.deliver.d": "Scalable production with trusted partners.",

  // Inquiry
  "inquiry.kicker": "Start a Project",
  "inquiry.title": "Tell us what you need.",
  "inquiry.intro": "Every inquiry is reviewed by an engineer and answered within one business day.",
  "f.name": "Name",
  "f.surname": "Surname",
  "f.email": "Email",
  "f.phone": "Phone",
  "f.company": "Company (optional)",
  "f.service": "Service",
  "f.material": "Material",
  "f.stage": "Project stage",
  "f.dimensions": "Dimensions",
  "f.quantity": "Quantity",
  "f.upload": "Upload files",
  "f.help1": "I don't have a design yet.",
  "f.help2": "I'd like help developing my idea.",
  "f.desc": "Project description",
  "f.desc.ph": "What is it for, where will it be used, when do you need it?",
  "f.submit": "Send",
  "f.sent": "Got it. An engineer will reply within one business day.",
  "f.select": "Select…",

  // Finale
  "finale.kicker": "Ready to build?",
  "finale.statement": "From concept to reality.",
  "finale.cta": "Start a Project",
  "finale.foot1": "© INOO3D",
  "finale.foot2": "​",
  "finale.foot3": "DESIGN · PROTOTYPE · MANUFACTURE · MASS PRODUCTION",
};

const gr: Dict = {
  "nav.intro": "Αρχική",
  "nav.capabilities": "Δυνατότητες",
  "nav.process": "Διαδικασία",
  "nav.work": "Έργα",
  "nav.faq": "Ερωτήσεις",
  "nav.forum": "Ενημερώσεις",
  "nav.inquiry": "Ξεκίνα Έργο",
  "nav.cta": "Ξεκίνα Έργο",

  "intro.headline": "Από την Ιδέα στην Πραγματικότητα",
  "intro.sub": "​",
  "intro.scroll": "Κύλιση",
  "intro.xyz": "DESIGN · PROTOTYPE · MANUFACTURE · MASS PRODUCTION",

  "concept.kicker": "Τι κάνουμε",
  "concept.title": "Σχεδιάζουμε, πρωτοτυποποιούμε και κατασκευάζουμε πραγματικά προϊόντα.",
  "concept.body": "Στείλτε μας ιδέα, σκίτσο ή αρχείο CAD. Το μελετάμε, το πρωτοτυποποιούμε και το κατασκευάζουμε — γρήγορα.",
  "concept.cta": "Ξεκίνα Έργο",

  "cap.kicker": "Δυνατότητες",
  "cap.title": "Έξι πράγματα που κάνουμε καλά.",
  "cap.body": "Πατήστε σε μια δυνατότητα για υλικά, ανοχές και οδηγίες αποστολής αρχείων.",
  "cap.cta": "Δείτε τη δυνατότητα",

  "cap.01.t": "Σχεδιασμός & Ανάπτυξη",
  "cap.01.d": "Μετατρέπουμε ιδέες σε κατασκευάσιμα CAD.",
  "cap.02.t": "Κοπή Fiber Laser",
  "cap.02.d": "Ακριβής κοπή σε χάλυβα, αλουμίνιο και ανοξείδωτο.",
  "cap.03.t": "Στραντζάρισμα & Συγκολλήσεις",
  "cap.03.d": "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων.",
  "cap.04.t": "3D Εκτύπωση",
  "cap.04.d": "Λειτουργικά εξαρτήματα και μικρές παραγωγές.",
  "cap.05.t": "Σχεδιασμός → Πρωτότυπο",
  "cap.05.d": "Από το σκίτσο σε λειτουργικό πρωτότυπο σε ημέρες.",
  "cap.06.t": "Παγκόσμιο Δίκτυο Παραγωγής",
  "cap.06.d": "Κλίμακα σε μαζική παραγωγή με αξιόπιστους συνεργάτες.",

  "ch.idea.k": "Βήμα 1",
  "ch.idea.t": "Στείλτε μας την ιδέα σας.",
  "ch.idea.d": "Σκίτσο, φωτογραφία ή αρχείο CAD. Αν δεν έχετε, σας βοηθάμε.",

  "ch.design.k": "Βήμα 2",
  "ch.design.t": "Τη σχεδιάζουμε.",
  "ch.design.d": "Οι μηχανικοί μας τη μετατρέπουν σε ακριβές, κατασκευάσιμο αρχείο.",

  "ch.proto.k": "Βήμα 3",
  "ch.proto.t": "Φτιάχνουμε το πρωτότυπο.",
  "ch.proto.d": "Κρατάτε λειτουργική έκδοση στα χέρια σας σε ημέρες — όχι μήνες.",

  "ch.mfg.k": "Βήμα 4",
  "ch.mfg.t": "Κατασκευή και παράδοση.",
  "ch.mfg.d": "Laser, στραντζάρισμα, συγκολλήσεις, 3D εκτύπωση — έτοιμα και αποστολή.",

  "portfolio.kicker": "Έργα",
  "portfolio.title": "Παραδείγματα προϊόντων και εξαρτημάτων από τη ροή εργασίας INOO3D.",

  "process.kicker": "Διαδικασία",
  "process.title": "Πώς δουλεύει.",
  "p.idea.t": "Ιδέα",
  "p.idea.d": "Στείλτε σκίτσο, αρχείο ή περιγραφή.",
  "p.design.t": "Σχεδίαση",
  "p.design.d": "Φτιάχνουμε κατασκευάσιμο αρχείο CAD.",
  "p.proto.t": "Πρωτότυπο",
  "p.proto.d": "Λειτουργικό δείγμα, γρήγορα.",
  "p.mfg.t": "Κατασκευή",
  "p.mfg.d": "Laser, στραντζάρισμα, συγκολλήσεις, 3D εκτύπωση.",
  "p.deliver.t": "Μαζική Παραγωγή",
  "p.deliver.d": "Κλίμακα σε μαζική παραγωγή με αξιόπιστους συνεργάτες.",

  "inquiry.kicker": "Ξεκίνα Έργο",
  "inquiry.title": "Πείτε μας τι χρειάζεστε.",
  "inquiry.intro": "Κάθε αίτημα ελέγχεται από μηχανικό και απαντάται εντός μίας εργάσιμης.",
  "f.name": "Όνομα",
  "f.surname": "Επώνυμο",
  "f.email": "Email",
  "f.phone": "Τηλέφωνο",
  "f.company": "Εταιρεία (προαιρετικό)",
  "f.service": "Υπηρεσία",
  "f.material": "Υλικό",
  "f.stage": "Στάδιο έργου",
  "f.dimensions": "Διαστάσεις",
  "f.quantity": "Ποσότητα",
  "f.upload": "Επισύναψη αρχείων",
  "f.help1": "Δεν έχω σχέδιο ακόμα.",
  "f.help2": "Χρειάζομαι βοήθεια στην ανάπτυξη της ιδέας.",
  "f.desc": "Περιγραφή έργου",
  "f.desc.ph": "Σε τι χρησιμεύει, πού θα χρησιμοποιηθεί, πότε το χρειάζεστε;",
  "f.submit": "Αποστολή",
  "f.sent": "Ελήφθη. Μηχανικός θα απαντήσει εντός μίας εργάσιμης.",
  "f.select": "Επιλέξτε…",

  "finale.kicker": "Έτοιμοι να φτιάξετε κάτι;",
  "finale.statement": "Από την ιδέα στην πραγματικότητα.",
  "finale.cta": "Ξεκινήστε το Έργο σας",
  "finale.foot1": "© INOO3D",
  "finale.foot2": "​",
  "finale.foot3": "DESIGN · PROTOTYPE · MANUFACTURE · MASS PRODUCTION",
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
