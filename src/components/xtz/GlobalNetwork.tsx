import { useI18n } from "./i18n";
import heroOffice from "@/assets/hero-office.jpg";

export function GlobalNetwork() {
  const { lang } = useI18n();
  const isGR = lang === "GR";

  const bullets = isGR
    ? [
        "Επιλεγμένοι κατασκευαστικοί συνεργάτες",
        "Παραγωγή μικρών και μεσαίων σειρών",
        "Συντονισμός παραγωγής όταν απαιτείται",
      ]
    : [
        "Selected manufacturing partners",
        "Small and medium production runs",
        "Production coordinated when required",
      ];

  return (
    <section id="network" className="relative w-full overflow-hidden bg-black py-28 md:py-40">
      <img
        src={heroOffice}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 30%, oklch(0.45 0.2 245 / 0.35), transparent 60%)" }}
      />

      <span className="absolute top-10 left-6 md:left-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        {isGR ? "—  / Δίκτυο" : "—  / Network"}
      </span>

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {isGR ? "Δίκτυο Συνεργατών" : "Partner Network"}
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5rem)] tracking-tighter mb-8">
            {isGR ? "Σειριακή παραγωγή με συνεργάτες." : "Series production with partners."}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-xl leading-relaxed font-light">
            {isGR
              ? "Όπου ένα έργο απαιτεί επιπλέον κατασκευαστικές δυνατότητες ή μεγαλύτερους όγκους παραγωγής, η TOREO μπορεί να συντονίσει την παραγωγή μέσω επιλεγμένων εξωτερικών συνεργατών. Η διαθεσιμότητα και ο χρόνος παράδοσης επιβεβαιώνονται μετά τον έλεγχο του έργου."
              : "Where a project requires additional manufacturing capabilities or higher production volumes, TOREO may coordinate production through selected external partners. Availability and lead time are confirmed after project review."}
          </p>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {bullets.map((b, i) => (
            <div
              key={i}
              className="glass-panel grain px-6 py-5 border border-primary/15 flex items-center gap-5"
              style={{ background: "linear-gradient(135deg, oklch(0.15 0.02 245 / 0.5), oklch(0.08 0.01 245 / 0.3))" }}
            >
              <span className="font-mono text-[14px] tracking-[0.3em] text-primary/70 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent max-w-[2rem]" />
              <span className="font-display text-base md:text-lg font-medium text-foreground">
                {b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
