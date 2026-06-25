import { useI18n, type Lang } from "./i18n";
import { Link } from "@tanstack/react-router";
import toreoLogo from "@/assets/toreo-logo.png.asset.json";

export function Footer() {
  const { lang, setLang, t } = useI18n();
  const toggle = (l: Lang) => () => setLang(l);

  return (
    <footer className="relative w-full overflow-hidden border-t border-border/40" style={{ backgroundColor: "#0e1628" }}>
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 brushed-metal opacity-[0.18]" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.55 0.22 245 / 0.32), transparent 60%)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.22 245 / 0.6), transparent)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-6 md:px-12 py-20 md:py-28">
        {/* Hero brand block */}
        <div className="grid lg:grid-cols-12 gap-12 pb-16 border-b border-border/40">
          <div className="lg:col-span-7 space-y-6">
            <div className="font-mono text-[14px] uppercase tracking-[0.5em] text-primary/80">
              {t("foot.tag")}
            </div>
            <img
              src={toreoLogo.url}
              alt="TOREO"
              className="block w-auto object-contain"
              style={{ height: "clamp(2.8rem, 9vw, 8rem)" }}
            />
            <p className="font-mono text-xs md:text-sm uppercase tracking-[0.55em] text-primary">
              {t("foot.tagline")}
            </p>
            <div className="pt-4 flex flex-wrap gap-x-6 gap-y-2 font-display text-xl md:text-2xl font-light text-foreground/85">
              {lang === "GR" ? (
                <>
                  <span>Σχεδιασμός.</span>
                  <span className="text-primary">Πρωτότυπο.</span>
                  <span>Κατασκευή.</span>
                  <span className="text-primary">Μαζική Παραγωγή.</span>
                </>
              ) : (
                <>
                  <span>Design.</span>
                  <span className="text-primary">Prototype.</span>
                  <span>Manufacture.</span>
                  <span className="text-primary">Mass Production.</span>
                </>
              )}
            </div>
          </div>

          {/* Contact block */}
          <div className="lg:col-span-5 grid sm:grid-cols-2 gap-8 lg:pl-8">
            <ContactCol
              label={t("foot.contact")}
              items={[
                { k: t("foot.email"), v: "INFO@TOREO.GR", href: "mailto:INFO@TOREO.GR" },
                { k: t("foot.phone"), v: "+30 6970609960", href: "tel:+306970609960" },
              ]}
            />
            <ContactCol
              label={t("foot.studio")}
              items={[
                { k: t("foot.location"), v: lang === "GR" ? "Θεσσαλονίκη" : "Thessaloniki" },
                { k: t("foot.hours"), v: t("foot.hours.v") },
              ]}
            />
          </div>
        </div>

        {/* Services index — internal links for SEO + discoverability */}
        <div className="py-10 border-b border-border/40">
          <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary/80 mb-5">
            {lang === "GR" ? "Υπηρεσίες" : "Services"}
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 font-display text-base md:text-lg">
            {(lang === "GR"
              ? [
                  { to: "/gr/cnc-machining" as const, label: "CNC Κατεργασίες" },
                  { to: "/gr/rapid-prototyping" as const, label: "Rapid Prototyping" },
                  { to: "/gr/custom-metal-parts" as const, label: "Custom Μεταλλικά Εξαρτήματα" },
                ]
              : [
                  { to: "/cnc-machining" as const, label: "CNC Machining" },
                  { to: "/rapid-prototyping" as const, label: "Rapid Prototyping" },
                  { to: "/custom-metal-parts" as const, label: "Custom Metal Parts" },
                ]
            ).map((s) => (
              <li key={s.to}>
                <Link to={s.to} className="text-foreground/85 hover:text-primary transition-colors">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom row */}
        <div className="pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="font-mono text-[14px] uppercase tracking-[0.35em] text-muted-foreground">
            © {new Date().getFullYear()} TOREO · {t("foot.rights")}
          </div>

          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[14px] uppercase tracking-[0.35em] text-muted-foreground">
            <a href="#concept" className="hover:text-primary transition-colors text-xs">{t("foot.nav.why")}</a>
            <a href="#capabilities" className="hover:text-primary transition-colors text-xs">{t("foot.nav.caps")}</a>
            <a href="#catalog" className="hover:text-primary transition-colors text-xs">{t("foot.nav.catalog")}</a>
            <a href="#network" className="hover:text-primary transition-colors text-xs">{t("foot.nav.network")}</a>
            <Link to="/start" className="hover:text-primary transition-colors text-xs">{t("foot.nav.inquiry")}</Link>
          </nav>

          <div className="flex items-center font-mono text-[11px] border border-border/60">
            <button
              onClick={toggle("GR")}
              className={`px-3 py-1.5 transition ${lang === "GR" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Greek"
            >GR</button>
            <span className="text-muted-foreground/40">|</span>
            <button
              onClick={toggle("EN")}
              className={`px-3 py-1.5 transition ${lang === "EN" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="English"
            >EN</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContactCol({
  label,
  items,
}: {
  label: string;
  items: { k: string; v: string; href?: string }[];
}) {
  return (
    <div>
      <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary/80 mb-5">
        {label}
      </div>
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.k}>
            <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground mb-1">
              {it.k}
            </div>
            {it.href ? (
              <a href={it.href} className="font-display text-base md:text-lg hover:text-primary transition-colors">
                {it.v}
              </a>
            ) : (
              <span className="font-display text-base md:text-lg">{it.v}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
