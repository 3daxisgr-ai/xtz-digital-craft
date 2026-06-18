import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { Menu, X } from "lucide-react";
import { useI18n, type Lang } from "./i18n";
import toreoLogo from "@/assets/toreo-logo.png.asset.json";

const links: { to: string; hash?: string; k: string }[] = [
  { to: "/", k: "nav.intro" },
  { to: "/", hash: "capabilities", k: "nav.capabilities" },
  { to: "/equipment", k: "nav.equipment" },
  { to: "/forum", k: "nav.forum" },
  { to: "/faq", k: "nav.faq" },
  { to: "/company", k: "nav.company" },
];

export function Navigation() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const reveal = () => {
      const ctx = gsap.context(() => {
        gsap.to(".nav-brand", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
        gsap.to(".nav-item", {
          opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.06, delay: 0.15,
        });
        gsap.to(".nav-lang", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.7 });
        gsap.to(".nav-cta", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.85 });
        gsap.to(".nav-burger", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.7 });
      }, root);
      return () => ctx.revert();
    };
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      reveal();
      return;
    }
    window.addEventListener("intro:ready", reveal as EventListener, { once: true });
    return () => window.removeEventListener("intro:ready", reveal as EventListener);
  }, []);

  const toggle = (l: Lang) => () => setLang(l);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        ref={root}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled || menuOpen ? "glass-panel py-3" : "py-4 md:py-6 bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-4 sm:px-6 md:px-12 gap-3 sm:gap-6">
          <Link
            to="/"
            onClick={closeMenu}
            className="nav-brand flex items-center gap-3 group opacity-0 translate-y-2 shrink-0"
          >
            <span className="relative inline-block h-12 w-28 sm:h-12 sm:w-28 md:h-9 md:w-20">
              <span className="absolute inset-0 bg-primary blur-lg opacity-50 group-hover:opacity-90 transition-opacity" />
              <img
                src={toreoLogo.url}
                alt="TOREO logo"
                className="relative h-full w-full object-contain"
                width={112}
                height={48}
              />
            </span>
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
              to="/start"
              className="nav-cta hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest border border-primary/40 px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 translate-y-2"
            >
              {t("nav.cta")}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="nav-burger lg:hidden inline-flex h-11 w-11 items-center justify-center border border-border/60 text-foreground hover:text-primary hover:border-primary/60 transition-colors opacity-0 translate-y-2"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile fullscreen menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(10,12,17,0.98) 0%, rgba(13,18,32,0.98) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full w-full flex-col overflow-y-auto pt-24 pb-10 px-6 sm:px-10">
          <ul className="flex flex-col gap-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {links.map((l, i) => (
              <li
                key={l.k}
                className={`transition-all duration-500 ${
                  menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
                style={{ transitionDelay: menuOpen ? `${80 + i * 50}ms` : "0ms" }}
              >
                <Link
                  to={l.to}
                  hash={l.hash}
                  onClick={closeMenu}
                  className="block py-4 border-b border-border/30 text-foreground hover:text-primary transition-colors"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: l.to === "/" && !l.hash }}
                >
                  {t(l.k)}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/start"
            onClick={closeMenu}
            className={`mt-10 inline-flex items-center justify-center w-full font-mono text-xs uppercase tracking-[0.3em] border border-primary px-6 py-4 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors ${
              menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{ transition: "all .5s ease", transitionDelay: menuOpen ? "420ms" : "0ms" }}
          >
            {t("nav.cta")}
          </Link>
        </div>
      </div>
    </>
  );
}
