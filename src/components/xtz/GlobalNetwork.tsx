import { useI18n } from "./i18n";
import heroOffice from "@/assets/hero-office.jpg";

export function GlobalNetwork() {
  const { lang } = useI18n();
  const isGR = lang === "GR";

  const bullets = isGR
    ? [
        "Trusted Manufacturing Partners",
        "Scalable Production Solutions",
        "Global Manufacturing Network",
      ]
    : [
        "Trusted Manufacturing Partners",
        "Scalable Production Solutions",
        "Global Manufacturing Network",
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
      <span className="absolute top-10 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">
        XYZ
      </span>

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {isGR ? "Παγκόσμιο Δίκτυο" : "Global Reach"}
          </div>
          <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5rem)] tracking-tighter mb-8">
            {isGR ? "Παγκόσμιο Δίκτυο Παραγωγής." : "Global Manufacturing Network."}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-xl leading-relaxed font-light">
            {isGR
              ? "Για έργα που απαιτούν παραγωγή μεγάλης κλίμακας, η INOO3D υποστηρίζει τους πελάτες της μέσω αξιόπιστων κατασκευαστικών συνεργατών, οδηγώντας τα προϊόντα από το πρωτότυπο σε κλιμακούμενη παραγωγή."
              : "For projects requiring large-scale production, INOO3D can assist clients through trusted manufacturing partners, helping transition products from prototype to scalable production."}
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
