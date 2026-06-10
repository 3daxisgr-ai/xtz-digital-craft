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
  "intro.headline": "​​SKG3D",
  "intro.sub": "​",
  "intro.scroll": "Scroll Down",
  "intro.xyz": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",

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
  "cap.06.t": "Mass Production",
  "cap.06.d": "Scale to series production with trusted partners.",

  // Chapters
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
  "f.review": "Manual engineering review · 1 business day",

  // Finale
  "finale.kicker": "Ready to build?",
  "finale.statement": "From concept to reality.",
  "finale.cta": "Start a Project",
  "finale.foot1": "© SKG3D",
  "finale.foot2": "​",
  "finale.foot3": "DESIGN · PROTOTYPE · MANUFACTURE · DELIVER",

  // About section
  "about.tag": "ABOUT US",
  "about.kicker": "About SKG3D",
  "about.title.l1": "A COMPLETE",
  "about.title.l2": "MANUFACTURING",
  "about.title.l3": "PARTNER.",
  "about.body": "Not a laser shop. Not a print shop. A full-stack manufacturing partner taking projects from concept to scalable production — under one roof.",
  "about.specialize": "We specialize in",

  // How it works
  "how.tag": "HOW WE WORK",
  "how.kicker": "How We Work",
  "how.title": "Six steps from idea to delivery.",
  "how.s1.t": "Send us your idea",
  "how.s1.d": "Sketch, drawing, STEP file or description.",
  "how.s2.t": "We review the project",
  "how.s2.d": "We get in touch and discuss the best approach.",
  "how.s3.t": "Design & Engineering",
  "how.s3.d": "If needed, we create or optimize the design.",
  "how.s4.t": "Prototype & Validation",
  "how.s4.d": "We produce and verify the first version.",
  "how.s5.t": "Manufacturing",
  "how.s5.d": "Production begins using the right process and material.",
  "how.s6.t": "Delivery",
  "how.s6.d": "Your finished parts are shipped to you.",

  // Project CTA
  "cta.tag": "— / INQUIRY",
  "cta.kicker": "READY TO BEGIN?",
  "cta.title.l1": "HAVE A PROJECT",
  "cta.title.l2": "IN MIND?",
  "cta.lead": "START HERE.",
  "cta.body1": "Whether you have a drawing, an existing design or just an idea — we can help turn it into a real product.",
  "cta.body2": "From design and prototyping to manufacturing and series production, we are ready to help.",
  "cta.button": "START YOUR PROJECT",

  // Capability page
  "capp.crumb.home": "Home",
  "capp.crumb.caps": "Capabilities",
  "capp.cta.quote": "Request a Quote",
  "capp.cta.all": "All Capabilities",
  "capp.h.what": "What we do",
  "capp.h.materials": "Materials & Technologies",
  "capp.h.process": "Process Overview",
  "capp.h.apps": "Applications",
  "capp.h.related": "Related Capabilities",
  "capp.step": "STEP",
  "capp.ready1": "Ready to build with",
  "capp.ready.body": "Send your files or a brief. An engineer will review and reply within one business day.",
  "capp.notfound": "Capability not found.",
  "capp.back": "← All capabilities",
  "capp.view": "View capability",

  // Forum
  "forum.title": "Workshop Updates",
  "forum.intro": "New equipment, materials and announcements from SKG3D.",
  "forum.kicker": "Forum",

  // FAQ page
  "faqp.title": "Frequently Asked Questions",
  "faqp.intro": "Everything you need to know before starting a project.",

  // Footer
  "foot.tag": "XYZ — coordinates of every build",
  "foot.tagline": "From Concept to Reality",
  "foot.contact": "Contact",
  "foot.studio": "Studio",
  "foot.email": "Email",
  "foot.phone": "Phone",
  "foot.location": "Location",
  "foot.hours": "Hours",
  "foot.hours.v": "Mon — Fri / 09:00 — 18:00",
  "foot.rights": "All rights reserved",
  "foot.nav.why": "Why",
  "foot.nav.caps": "Capabilities",
  "foot.nav.catalog": "Catalog",
  "foot.nav.work": "Work",
  "foot.nav.process": "Process",
  "foot.nav.network": "Network",
  "foot.nav.inquiry": "Inquiry",

};

const gr: Dict = {
  "nav.intro": "Αρχική",
  "nav.capabilities": "Δυνατότητες",
  "nav.process": "Διαδικασία",
  "nav.work": "Έργα",
  "nav.faq": "Ερωτήσεις",
  "nav.forum": "Νέα",
  "nav.inquiry": "Ξεκινήστε Έργο",
  "nav.cta": "Ξεκινήστε Έργο",

  "intro.headline": "Από την Ιδέα στην Πραγματικότητα",
  "intro.sub": "​",
  "intro.scroll": "Κύλιση",
  "intro.xyz": "ΣΧΕΔΙΑΣΜΟΣ · ΠΡΩΤΟΤΥΠΟ · ΚΑΤΑΣΚΕΥΗ · ΠΑΡΑΔΟΣΗ",

  "concept.kicker": "Τι κάνουμε",
  "concept.title": "Σχεδιάζουμε, πρωτοτυποποιούμε και κατασκευάζουμε πραγματικά προϊόντα.",
  "concept.body": "Στείλτε μας την ιδέα, το σκίτσο ή το αρχείο CAD σας. Το μελετάμε, το πρωτοτυποποιούμε και κατασκευάζουμε το τελικό εξάρτημα — γρήγορα.",
  "concept.cta": "Ξεκινήστε Έργο",

  "cap.kicker": "Δυνατότητες",
  "cap.title": "Έξι πράγματα που κάνουμε εξαιρετικά.",
  "cap.body": "Επιλέξτε μια δυνατότητα για υλικά, ανοχές και οδηγίες αποστολής αρχείων.",
  "cap.cta": "Δείτε τη δυνατότητα",

  "cap.01.t": "Σχεδιασμός & Ανάπτυξη",
  "cap.01.d": "Μετατρέπουμε ιδέες σε κατασκευάσιμα αρχεία CAD.",
  "cap.02.t": "Κοπή Fiber Laser",
  "cap.02.d": "Ακριβής κοπή σε χάλυβα, αλουμίνιο και ανοξείδωτο.",
  "cap.03.t": "Στραντζάρισμα & Συγκολλήσεις",
  "cap.03.d": "Κάμψη, συγκόλληση και συναρμολόγηση μεταλλικών εξαρτημάτων.",
  "cap.04.t": "3D Εκτύπωση",
  "cap.04.d": "Λειτουργικά εξαρτήματα και μικρές σειρές παραγωγής.",
  "cap.05.t": "Σχεδιασμός → Πρωτότυπο",
  "cap.05.d": "Από το σκίτσο σε λειτουργικό πρωτότυπο μέσα σε ημέρες.",
  "cap.06.t": "Μαζική Παραγωγή",
  "cap.06.d": "Κλιμάκωση σε σειριακή παραγωγή με αξιόπιστους συνεργάτες.",

  "ch.idea.k": "Βήμα 1",
  "ch.idea.t": "Στείλτε μας την ιδέα σας.",
  "ch.idea.d": "Σκίτσο, φωτογραφία ή αρχείο CAD. Αν δεν έχετε, σας βοηθάμε να το φτιάξετε.",
  "ch.design.k": "Βήμα 2",
  "ch.design.t": "Τη σχεδιάζουμε.",
  "ch.design.d": "Οι μηχανικοί μας τη μετατρέπουν σε ακριβές, κατασκευάσιμο αρχείο.",
  "ch.proto.k": "Βήμα 3",
  "ch.proto.t": "Φτιάχνουμε το πρωτότυπο.",
  "ch.proto.d": "Κρατάτε λειτουργική έκδοση στα χέρια σας μέσα σε ημέρες — όχι μήνες.",
  "ch.mfg.k": "Βήμα 4",
  "ch.mfg.t": "Κατασκευή και παράδοση.",
  "ch.mfg.d": "Laser, στραντζάρισμα, συγκολλήσεις, 3D εκτύπωση — έτοιμα και αποστολή.",

  "portfolio.kicker": "Έργα",
  "portfolio.title": "Παραδείγματα προϊόντων και εξαρτημάτων από τη ροή εργασίας της SKG3D.",

  "process.kicker": "Διαδικασία",
  "process.title": "Πώς λειτουργεί.",
  "p.idea.t": "Ιδέα",
  "p.idea.d": "Στείλτε μας σκίτσο, αρχείο ή περιγραφή.",
  "p.design.t": "Σχεδιασμός",
  "p.design.d": "Δημιουργούμε ένα κατασκευάσιμο αρχείο CAD.",
  "p.proto.t": "Πρωτότυπο",
  "p.proto.d": "Λειτουργικό δείγμα, γρήγορα.",
  "p.mfg.t": "Κατασκευή",
  "p.mfg.d": "Laser, στραντζάρισμα, συγκολλήσεις, 3D εκτύπωση.",
  "p.deliver.t": "Μαζική Παραγωγή",
  "p.deliver.d": "Κλιμακούμενη παραγωγή με αξιόπιστους συνεργάτες.",

  "inquiry.kicker": "Ξεκινήστε Έργο",
  "inquiry.title": "Πείτε μας τι χρειάζεστε.",
  "inquiry.intro": "Κάθε αίτημα ελέγχεται από μηχανικό και απαντάται εντός μίας εργάσιμης ημέρας.",
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
  "f.help1": "Δεν έχω ακόμη σχέδιο.",
  "f.help2": "Θέλω βοήθεια στην ανάπτυξη της ιδέας μου.",
  "f.desc": "Περιγραφή έργου",
  "f.desc.ph": "Σε τι χρησιμεύει, πού θα χρησιμοποιηθεί, πότε το χρειάζεστε;",
  "f.submit": "Αποστολή",
  "f.sent": "Ελήφθη. Μηχανικός θα σας απαντήσει εντός μίας εργάσιμης ημέρας.",
  "f.select": "Επιλέξτε…",
  "f.review": "Έλεγχος από μηχανικό · 1 εργάσιμη ημέρα",

  "finale.kicker": "Έτοιμοι να φτιάξετε κάτι;",
  "finale.statement": "Από την ιδέα στην πραγματικότητα.",
  "finale.cta": "Ξεκινήστε το Έργο σας",
  "finale.foot1": "© SKG3D",
  "finale.foot2": "​",
  "finale.foot3": "ΣΧΕΔΙΑΣΜΟΣ · ΠΡΩΤΟΤΥΠΟ · ΚΑΤΑΣΚΕΥΗ · ΠΑΡΑΔΟΣΗ",

  // About
  "about.tag": "ΣΧΕΤΙΚΑ",
  "about.kicker": "Σχετικά με τη SKG3D",
  "about.title.l1": "ΟΛΟΚΛΗΡΩΜΕΝΟΣ ΣΥΝΕΡΓΑΤΗΣ",
  "about.title.l2": "",
  "about.title.l3": "",
  "about.body": "Δεν είμαστε απλώς εργαστήριο laser. Δεν είμαστε απλώς εργαστήριο 3D εκτύπωσης. Είμαστε ένας ολοκληρωμένος συνεργάτης , που αναλαμβάνει έργα από την ιδέα έως την μαζική παραγωγή — όλα κάτω από μία στέγη.",
  "about.specialize": "Εξειδικευόμαστε σε",

  // How it works
  "how.tag": "Η ΜΕΘΟΔΟΣ ΜΑΣ",
  "how.kicker": "Η μέθοδος μας",
  "how.title": "Έξι βήματα από την ιδέα στην παράδοση.",
  "how.s1.t": "Στείλτε μας την ιδέα σας",
  "how.s1.d": "Σκίτσο, σχέδιο, αρχείο STEP ή περιγραφή.",
  "how.s2.t": "Αξιολογούμε το έργο",
  "how.s2.d": "Επικοινωνούμε μαζί σας και συζητάμε τη βέλτιστη προσέγγιση.",
  "how.s3.t": "Σχεδιασμός & Μελέτη",
  "how.s3.d": "Εφόσον χρειάζεται, δημιουργούμε ή βελτιστοποιούμε το σχέδιο.",
  "how.s4.t": "Πρωτότυπο & Έλεγχος",
  "how.s4.d": "Παράγουμε και επαληθεύουμε την πρώτη έκδοση.",
  "how.s5.t": "Κατασκευή",
  "how.s5.d": "Η παραγωγή ξεκινά με την κατάλληλη μέθοδο και υλικό.",
  "how.s6.t": "Παράδοση",
  "how.s6.d": "Τα έτοιμα εξαρτήματα αποστέλλονται σε εσάς.",

  // Project CTA
  "cta.tag": "— / ΑΙΤΗΜΑ",
  "cta.kicker": "ΕΤΟΙΜΟΙ ΝΑ ΞΕΚΙΝΗΣΕΤΕ;",
  "cta.title.l1": "ΕΧΕΤΕ ΕΡΓΟ",
  "cta.title.l2": "ΣΤΟ ΜΥΑΛΟ ΣΑΣ;",
  "cta.lead": "ΞΕΚΙΝΗΣΤΕ ΕΔΩ.",
  "cta.body1": "Είτε έχετε σχέδιο, υπάρχουσα μελέτη ή απλώς μια ιδέα — μπορούμε να τη μετατρέψουμε σε πραγματικό προϊόν.",
  "cta.body2": "Από τον σχεδιασμό και την πρωτοτυποποίηση έως την κατασκευή και τη μαζική παραγωγή, είμαστε στη διάθεσή σας.",
  "cta.button": "ΣΤΕΙΛΤΕ ΤΟ ΕΡΓΟ ΣΑΣ",

  // Capability page
  "capp.crumb.home": "Αρχική",
  "capp.crumb.caps": "Δυνατότητες",
  "capp.cta.quote": "Ζητήστε Προσφορά",
  "capp.cta.all": "Όλες οι Δυνατότητες",
  "capp.h.what": "Τι κάνουμε",
  "capp.h.materials": "Υλικά & Τεχνολογίες",
  "capp.h.process": "Επισκόπηση Διαδικασίας",
  "capp.h.apps": "Εφαρμογές",
  "capp.h.related": "Συναφείς Δυνατότητες",
  "capp.step": "ΒΗΜΑ",
  "capp.ready1": "Έτοιμοι να ξεκινήσετε με",
  "capp.ready.body": "Στείλτε τα αρχεία ή μια σύντομη περιγραφή. Μηχανικός θα ελέγξει και θα απαντήσει εντός μίας εργάσιμης ημέρας.",
  "capp.notfound": "Η δυνατότητα δεν βρέθηκε.",
  "capp.back": "← Όλες οι δυνατότητες",
  "capp.view": "Δείτε τη δυνατότητα",

  // Forum
  "forum.title": "Νέα από το Εργαστήριο",
  "forum.intro": "Νέος εξοπλισμός, υλικά και ανακοινώσεις από τη SKG3D.",
  "forum.kicker": "Νέα",

  // FAQ page
  "faqp.title": "Συχνές Ερωτήσεις",
  "faqp.intro": "Όλα όσα χρειάζεται να γνωρίζετε πριν ξεκινήσετε ένα έργο.",

  // Footer
  "foot.tag": "XYZ — οι συντεταγμένες κάθε κατασκευής",
  "foot.tagline": "Από την Ιδέα στην Πραγματικότητα",
  "foot.contact": "Επικοινωνία",
  "foot.studio": "Στούντιο",
  "foot.email": "Email",
  "foot.phone": "Τηλέφωνο",
  "foot.location": "Τοποθεσία",
  "foot.hours": "Ωράριο",
  "foot.hours.v": "Δευ — Παρ / 09:00 — 18:00",
  "foot.rights": "Με επιφύλαξη παντός δικαιώματος",
  "foot.nav.why": "Γιατί εμάς",
  "foot.nav.caps": "Δυνατότητες",
  "foot.nav.catalog": "Κατάλογος",
  "foot.nav.work": "Έργα",
  "foot.nav.process": "Διαδικασία",
  "foot.nav.network": "Δίκτυο",
  "foot.nav.inquiry": "Αίτημα",

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
