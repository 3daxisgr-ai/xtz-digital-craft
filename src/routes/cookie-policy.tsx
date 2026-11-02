import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { CONSENT_MONTHS, openConsentSettings } from "@/lib/consent";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Πολιτική Cookies | TOREO" },
      { name: "description", content: "Ποια cookies και ποια τοπική αποθήκευση χρησιμοποιεί ο ιστότοπος της TOREO, για ποιο σκοπό, για πόσο διάστημα και πώς αλλάζετε τη συγκατάθεσή σας." },
      { property: "og:title", content: "Πολιτική Cookies — TOREO" },
      { property: "og:description", content: "Απαραίτητα, λειτουργικά και στατιστικά cookies του toreo.gr και πώς διαχειρίζεστε τις επιλογές σας." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/cookie-policy" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Πολιτική Cookies — TOREO" },
      { name: "twitter:description", content: "Τι αποθηκεύει ο ιστότοπος της TOREO και πώς αλλάζετε τη συγκατάθεσή σας." },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/cookie-policy" }],
  }),
  component: CookiePolicyPage,
});

type Row = { name: string; type: string; provider: string; purpose: string; duration: string };

const NECESSARY: Row[] = [
  {
    name: "__cf_bm",
    type: "Cookie (HTTP)",
    provider: "Cloudflare (δίκτυο της πλατφόρμας φιλοξενίας)",
    purpose: "Προστασία του ιστοτόπου από αυτοματοποιημένη κακόβουλη κίνηση (bots).",
    duration: "30 λεπτά",
  },
  {
    name: "__dpl",
    type: "Cookie (HTTP)",
    provider: "Πλατφόρμα φιλοξενίας του ιστοτόπου",
    purpose: "Τεχνικό cookie που ορίζεται αυτόματα από τη φιλοξενία κατά τη φόρτωση της σελίδας, για την εξυπηρέτηση του ιστοτόπου. Ο πάροχος δεν δημοσιεύει αναλυτική περιγραφή· δεν χρησιμοποιείται από την TOREO για παρακολούθηση.",
    duration: "24 ώρες",
  },
  {
    name: "toreo-consent",
    type: "Τοπική αποθήκευση (localStorage)",
    provider: "TOREO",
    purpose: "Αποθηκεύει την επιλογή σας για τα cookies (κατηγορίες, ημερομηνία, έκδοση πολιτικής), ώστε να μη σας ρωτάμε σε κάθε επίσκεψη.",
    duration: `${CONSENT_MONTHS} μήνες· μετά σας ζητείται ξανά`,
  },
  {
    name: "axis-lang",
    type: "Τοπική αποθήκευση (localStorage)",
    provider: "TOREO",
    purpose: "Θυμάται τη γλώσσα (Ελληνικά/Αγγλικά), μόνο αφού την επιλέξετε εσείς.",
    duration: "Δεν λήγει αυτόματα· διαγράφεται όταν καθαρίσετε τα δεδομένα του browser",
  },
  {
    name: "sb-…-auth-token",
    type: "Τοπική αποθήκευση (localStorage)",
    provider: "TOREO (υπηρεσία σύνδεσης)",
    purpose: "Διατηρεί τη σύνδεσή σας, μόνο εφόσον συνδεθείτε στο portal πελατών ή στη διαχείριση.",
    duration: "Μέχρι να αποσυνδεθείτε",
  },
];

const FUNCTIONAL: Row[] = [
  {
    name: "toreo:hero-start",
    type: "Τοπική αποθήκευση (localStorage)",
    provider: "TOREO",
    purpose: "Θυμάται από ποιο σημείο ξεκίνησε το βίντεο της αρχικής σελίδας, ώστε στην επόμενη επίσκεψη να ξεκινά από διαφορετικό σημείο. Χωρίς συγκατάθεση το βίντεο ξεκινά απλώς από τυχαίο σημείο.",
    duration: "Δεν λήγει αυτόματα· διαγράφεται αμέσως αν ανακαλέσετε τη συγκατάθεση",
  },
];

const ANALYTICS: Row[] = [
  {
    name: "session-id",
    type: "Cookie",
    provider: "Πλατφόρμα φιλοξενίας του ιστοτόπου (στατιστικά επισκεψιμότητας)",
    purpose: "Ομαδοποιεί τις σελίδες μίας επίσκεψης για τη μέτρηση επισκέψεων. Καταγράφονται η σελίδα, η προηγούμενη σελίδα (referrer), ο τύπος browser/συσκευής, η γλώσσα και η κατά προσέγγιση χώρα από τη ζώνη ώρας. Δεν φορτώνεται και δεν αποστέλλεται τίποτα πριν από τη συγκατάθεσή σας.",
    duration: "30 λεπτά",
  },
];

const THIRD_PARTY: { name: string; where: string; what: string }[] = [
  {
    name: "Google Fonts (Google)",
    where: "Αρχική σελίδα",
    what: "Φόρτωση γραμματοσειρών. Δεν ορίζει cookies· ο πάροχος λαμβάνει τη διεύθυνση IP σας, όπως σε κάθε αίτημα αρχείου.",
  },
  {
    name: "Cloudflare R2",
    where: "Αρχική σελίδα",
    what: "Φιλοξενία του βίντεο της αρχικής σελίδας. Δεν ορίζει cookies.",
  },
  {
    name: "Παρακολούθηση σφαλμάτων της πλατφόρμας φιλοξενίας",
    where: "Όλες οι σελίδες",
    what: "Τεχνικά μηνύματα σφαλμάτων και ταχύτητας φόρτωσης για τη σωστή λειτουργία. Δεν αποθηκεύει cookies ή δεδομένα στη συσκευή σας.",
  },
  {
    name: "raw.githack.com",
    where: "Προβολή 3D μοντέλου στις σελίδες προσφοράς / παρακολούθησης",
    what: "Φόρτωση αρχείου φωτισμού για την τρισδιάστατη προβολή. Δεν ορίζει cookies.",
  },
  {
    name: "QR Server (api.qrserver.com)",
    where: "Σελίδα παραγγελίας στο portal πελατών",
    what: "Δημιουργία εικόνας QR για τον σύνδεσμο παρακολούθησης της παραγγελίας. Ο σύνδεσμος αποστέλλεται στον πάροχο για τη δημιουργία της εικόνας.",
  },
];

function Table({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-5 overflow-x-auto border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-secondary/50 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Όνομα</th>
            <th scope="col" className="px-4 py-3 font-normal">Τύπος / Πάροχος</th>
            <th scope="col" className="px-4 py-3 font-normal">Σκοπός</th>
            <th scope="col" className="px-4 py-3 font-normal">Διάρκεια</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.name} className="align-top">
              <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{r.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <div>{r.type}</div>
                <div className="text-xs mt-1">{r.provider}</div>
              </td>
              <td className="px-4 py-3 text-foreground/85 leading-relaxed">{r.purpose}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="py-10 border-t border-border">
      <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary">{n}</div>
      <h2 className="mt-3 font-display text-2xl md:text-3xl tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3 text-foreground/75 leading-relaxed">{children}</div>
    </section>
  );
}

function CookiePolicyPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <Navigation />
      <section className="relative pt-40 pb-12 px-6 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">Cookies · Απόρρητο</div>
          <h1 className="font-display font-bold leading-[0.95] text-[clamp(2.4rem,6vw,4.5rem)] tracking-tighter">
            Πολιτική Cookies
          </h1>
          <p className="mt-6 max-w-2xl text-foreground/70 leading-relaxed">
            Εδώ περιγράφουμε ακριβώς τι αποθηκεύει ο ιστότοπος toreo.gr στη συσκευή σας, γιατί, και για πόσο. Αναφέρουμε μόνο ό,τι
            χρησιμοποιείται πραγματικά. Δεν χρησιμοποιούμε cookies διαφήμισης ή marketing, ούτε ενσωματωμένο περιεχόμενο κοινωνικών δικτύων.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openConsentSettings}
              className="min-h-11 px-5 border border-primary/60 bg-primary/10 font-display text-sm text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ρυθμίσεις cookies
            </button>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Τελευταία ενημέρωση: 2 Νοεμβρίου 2026
            </span>
          </div>
        </div>
      </section>

      <div className="px-6 md:px-12 pb-24">
        <div className="mx-auto max-w-4xl">
          <Section n="01" title="Τι είναι τα cookies">
            <p>
              Τα cookies και η τοπική αποθήκευση (localStorage) είναι μικρά αρχεία ή τιμές που αποθηκεύονται στον browser σας. Ορισμένα
              είναι απαραίτητα για να λειτουργεί ο ιστότοπος· τα υπόλοιπα χρησιμοποιούνται μόνο με τη συγκατάθεσή σας.
            </p>
            <p>
              Υπεύθυνος: TOREO, Θεσσαλονίκη · <a href="mailto:info@toreo.gr" className="text-foreground underline decoration-primary/60 underline-offset-4">info@toreo.gr</a>
            </p>
          </Section>

          <Section n="02" title="Απαραίτητα — πάντα ενεργά">
            <p>Χρειάζονται για την ασφάλεια, τη φιλοξενία και τις λειτουργίες που ζητάτε εσείς. Δεν απαιτούν συγκατάθεση.</p>
            <Table rows={NECESSARY} />
          </Section>

          <Section n="03" title="Λειτουργικά — προαιρετικά">
            <p>Ενεργοποιούνται μόνο αν τα αποδεχθείτε. Αν τα απορρίψετε, ο ιστότοπος λειτουργεί κανονικά.</p>
            <Table rows={FUNCTIONAL} />
          </Section>

          <Section n="04" title="Στατιστικά — προαιρετικά">
            <p>
              Η πλατφόρμα φιλοξενίας του ιστοτόπου παρέχει μέτρηση επισκεψιμότητας. Μέχρι να δώσετε συγκατάθεση, ο ιστότοπος μπλοκάρει την
              αποστολή αυτών των στατιστικών και το σχετικό cookie. Αν ανακαλέσετε τη συγκατάθεση, η μέτρηση σταματά αμέσως και το cookie διαγράφεται.
            </p>
            <Table rows={ANALYTICS} />
          </Section>

          <Section n="05" title="Περιεχόμενο από τρίτους χωρίς cookies">
            <p>
              Οι παρακάτω υπηρεσίες φορτώνουν αρχεία που χρειάζεται η σελίδα. Δεν αποθηκεύουν cookies στη συσκευή σας, αλλά, όπως κάθε
              διακομιστής, λαμβάνουν τη διεύθυνση IP και τα τεχνικά στοιχεία του αιτήματος.
            </p>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {THIRD_PARTY.map((t) => (
                <li key={t.name} className="py-4 grid md:grid-cols-[220px_1fr] gap-2">
                  <div>
                    <div className="font-display text-foreground">{t.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">{t.where}</div>
                  </div>
                  <p className="text-sm text-foreground/75 leading-relaxed">{t.what}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section n="06" title="Πώς αλλάζετε ή ανακαλείτε τη συγκατάθεση">
            <p>
              Πατήστε «Ρυθμίσεις cookies» σε αυτή τη σελίδα ή στο κάτω μέρος κάθε σελίδας. Μπορείτε να αποδεχθείτε όλα, να απορρίψετε τα
              προαιρετικά με ένα κλικ ή να επιλέξετε ανά κατηγορία. Η αλλαγή ισχύει αμέσως, και σε άλλες ανοιχτές καρτέλες.
            </p>
            <p>
              Η επιλογή σας ισχύει για {CONSENT_MONTHS} μήνες· μετά, ή αν αλλάξει αυτή η πολιτική, θα σας ζητηθεί ξανά. Μπορείτε επίσης να
              διαγράψετε cookies και τοπική αποθήκευση από τις ρυθμίσεις του browser σας.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={openConsentSettings}
                className="min-h-11 px-5 border border-border bg-secondary/70 font-display text-sm text-foreground transition-colors hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Άνοιγμα ρυθμίσεων cookies
              </button>
            </div>
          </Section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
