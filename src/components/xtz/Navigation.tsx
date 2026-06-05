import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useI18n, type Lang } from "./i18n";
import xyzLogo from "@/assets/xyz-logo.png.asset.json";

const links: { to: string; hash?: string; k: string }[] = [
  { to: "/", k: "nav.intro" },
  { to: "/", hash: "capabilities", k: "nav.capabilities" },
  { to: "/", hash: "process", k: "nav.process" },
  { to: "/", hash: "portfolio", k: "nav.work" },
  { to: "/forum", k: "nav.forum" },
  { to: "/faq", k: "nav.faq" },
];

export function Navigation() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reveal = () => {
      const ctx = gsap.context(() => {
        gsap.to(".nav-brand", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
        gsap.to(".nav-item", {
          opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.06, delay: 0.15,
        });
        gsap.to(".nav-lang", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.7 });
        gsap.to(".nav-cta", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.85 });
      }, root);
      return () => ctx.revert();
    };
    // Reveal immediately for non-home pages; home dispatches intro:ready
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      reveal();
      return;
    }
    window.addEventListener("intro:ready", reveal as EventListener, { once: true });
    return () => window.removeEventListener("intro:ready", reveal as EventListener);
  }, []);

  const toggle = (l: Lang) => () => setLang(l);

  return (
    <header
      ref={root}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-panel py-3" : "py-6 bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12 gap-6">
        <Link to="/" className="nav-brand flex items-center gap-3 group opacity-0 translate-y-2">
          <span className="relative inline-block h-9 w-9">
            <span className="absolute inset-0 bg-primary blur-lg opacity-50 group-hover:opacity-90 transition-opacity" />
            <img
              src={xyzLogo.url}
              alt="INOO3D XYZ logo"
              className="relative h-full w-full object-contain"
              width={36}
              height={36}
            />
          </span>
          <span className="font-display text-lg font-bold tracking-[0.3em]">INOO3D</span>
        </Link>
        <ul className="hidden lg:flex items-center gap-8 font-mono text-[14px] uppercase tracking-widest">
          {links.map((l) => (
            <li key={l.k} className="nav-item opacity-0 translate-y-3">
              <Link
                to={l.to}
                hash={l.hash}
                className="text-muted-foreground hover:text-primary transition-colors"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: l.to === "/" && !l.hash }}
              >
                {t(l.k)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <div className="nav-lang flex items-center font-mono text-[11px] border border-border/60 opacity-0 translate-y-2">
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
          <Link
            to="/start-project"
            className="nav-cta hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest border border-primary/40 px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 translate-y-2"
          >
            {t("nav.cta")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
