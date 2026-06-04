import { useEffect, useState } from "react";
import { useI18n, type Lang } from "./i18n";

const chapters = [
  { id: "intro", k: "nav.intro" },
  { id: "idea", k: "nav.idea" },
  { id: "design", k: "nav.design" },
  { id: "prototype", k: "nav.prototype" },
  { id: "manufacture", k: "nav.manufacture" },
  { id: "portfolio", k: "nav.portfolio" },
  { id: "process", k: "nav.process" },
  { id: "inquiry", k: "nav.inquiry" },
];

export function Navigation() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      let current = "intro";
      for (const c of chapters) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 2) current = c.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = (l: Lang) => () => setLang(l);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-panel py-3" : "py-6 bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12 gap-6">
        <a href="#intro" className="flex items-center gap-3 group">
          <span className="relative inline-block h-6 w-6">
            <span className="absolute inset-0 bg-primary blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex h-full w-full items-center justify-center brushed-metal border border-primary/40 font-mono text-[8px] text-primary">XYZ</span>
          </span>
          <span className="font-display text-lg font-bold tracking-[0.3em]">3D&nbsp;AXIS</span>
        </a>
        <ul className="hidden lg:flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className={`transition-colors ${
                  active === c.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(c.k)}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <div className="flex items-center font-mono text-[11px] border border-border/60">
            <button
              onClick={toggle("GR")}
              className={`px-2 py-1 transition ${lang === "GR" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Greek"
            >GR</button>
            <span className="text-muted-foreground/40">|</span>
            <button
              onClick={toggle("EN")}
              className={`px-2 py-1 transition ${lang === "EN" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="English"
            >EN</button>
          </div>
          <a
            href="#inquiry"
            className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest border border-primary/40 px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {t("nav.cta")}
          </a>
        </div>
      </nav>
    </header>
  );
}
