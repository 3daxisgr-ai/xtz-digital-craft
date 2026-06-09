import { useI18n, type Lang } from "./i18n";

export function Footer() {
  const { lang, setLang } = useI18n();
  const toggle = (l: Lang) => () => setLang(l);

  return (
    <footer className="relative w-full overflow-hidden bg-black border-t border-border/40">
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 brushed-metal opacity-[0.12]" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.5 0.22 245 / 0.35), transparent 60%)" }}
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
              XYZ — coordinates of every build
            </div>
            <h2 className="font-display font-bold leading-[0.85] text-[clamp(2.8rem,9vw,8rem)] tracking-tighter text-glow">
              SKG3D
            </h2>
            <p className="font-mono text-xs md:text-sm uppercase tracking-[0.55em] text-primary">
              From Concept to Reality
            </p>
            <div className="pt-4 flex flex-wrap gap-x-6 gap-y-2 font-display text-xl md:text-2xl font-light text-foreground/80">
              <span>Design.</span>
              <span className="text-primary">Prototype.</span>
              <span>Manufacture.</span>
              <span className="text-primary">Mass Production.</span>
            </div>
          </div>

          {/* Contact block */}
          <div className="lg:col-span-5 grid sm:grid-cols-2 gap-8 lg:pl-8">
            <ContactCol
              label="Contact"
              items={[
                { k: "Email", v: "3daxis.gr@gmail.com", href: "mailto:3daxis.gr@gmail.com" },
                { k: "Phone", v: "+30 690000000", href: "tel:+30690000000" },
              ]}
            />
            <ContactCol
              label="Studio"
              items={[
                { k: "Location", v: "εο2 19ο χλμ Π.Ε.Ο, EO Thessalonikis Kavalas, Lagkadas 572 00" },
                { k: "Hours", v: "Mon — Fri / 09:00 — 18:00" },
              ]}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="font-mono text-[14px] uppercase tracking-[0.35em] text-muted-foreground">
            © {new Date().getFullYear()} SKG3D · All rights reserved
          </div>

          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[14px] uppercase tracking-[0.35em] text-muted-foreground">
            <a href="#concept" className="hover:text-primary transition-colors">Why</a>
            <a href="#capabilities" className="hover:text-primary transition-colors">Capabilities</a>
            <a href="#portfolio" className="hover:text-primary transition-colors">Work</a>
            <a href="#process" className="hover:text-primary transition-colors">Process</a>
            <a href="#network" className="hover:text-primary transition-colors">Network</a>
            <a href="#inquiry" className="hover:text-primary transition-colors">Inquiry</a>
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
