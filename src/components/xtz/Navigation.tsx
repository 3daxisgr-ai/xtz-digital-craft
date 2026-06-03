import { useEffect, useState } from "react";

const chapters = [
  { id: "intro", label: "00 / Intro" },
  { id: "laser", label: "01 / Laser" },
  { id: "print", label: "02 / Print" },
  { id: "fab", label: "03 / Fabrication" },
  { id: "portfolio", label: "04 / Portfolio" },
  { id: "process", label: "05 / Process" },
  { id: "quote", label: "06 / Quote" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      let current = "intro";
      for (const c of chapters) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 2) {
          current = c.id;
        }
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-panel py-3" : "py-6 bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12">
        <a href="#intro" className="flex items-center gap-2 group">
          <span className="relative inline-block h-6 w-6">
            <span className="absolute inset-0 bg-primary blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="relative block h-full w-full brushed-metal border border-primary/40" />
          </span>
          <span className="font-display text-lg font-bold tracking-[0.3em]">XTZ</span>
        </a>
        <ul className="hidden md:flex items-center gap-8 font-mono text-[11px] uppercase tracking-widest">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className={`transition-colors ${
                  active === c.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#quote"
          className="font-mono text-[11px] uppercase tracking-widest border border-primary/40 px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Request Quote
        </a>
      </nav>
    </header>
  );
}
