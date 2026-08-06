import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { PortfolioIntro } from "@/components/portfolio/PortfolioIntro";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { ProjectViewerHost } from "@/components/portfolio/ProjectViewer";
import { FILTER_FIELDS, PROJECTS, type Project } from "@/components/portfolio/projects";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Engineering Portfolio — TOREO 3D Printing & Metal Fabrication" },
      { name: "description", content: "Explore TOREO engineering projects as interactive 3D CAD models: weldments, enclosures, gearboxes and replacement parts with full material, tolerance and process data." },
      { property: "og:title", content: "Engineering Portfolio — Interactive 3D CAD Projects | TOREO" },
      { property: "og:description", content: "Interactive 3D portfolio of laser-cut, bent, welded and 3D-printed parts produced by TOREO in Thessaloniki." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Engineering Portfolio — Interactive 3D CAD Projects | TOREO" },
      { name: "twitter:description", content: "Explore TOREO manufacturing projects as interactive 3D models with full engineering data." },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/portfolio" }],
  }),
  component: PortfolioPage,
});

type SortKey = "newest" | "oldest" | "alpha" | "views" | "featured";

const SORTS: { k: SortKey; label: string }[] = [
  { k: "newest", label: "Newest" },
  { k: "oldest", label: "Oldest" },
  { k: "alpha", label: "A–Z" },
  { k: "views", label: "Most viewed" },
  { k: "featured", label: "Featured" },
];

const FILTER_KEYS = ["material", "technology", "industry", "software", "machine", "year", "tags"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function PortfolioPage() {
  const [introDone, setIntroDone] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    material: "", technology: "", industry: "", software: "", machine: "", year: "", tags: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [active, setActive] = useState<Project | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = PROJECTS.filter((p) => {
      if (q) {
        const hay = [p.title, p.summary, p.description, p.material, p.industry, p.software, p.machine, p.fileName, ...p.tags]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.material && p.material !== filters.material) return false;
      if (filters.technology && p.technology !== filters.technology) return false;
      if (filters.industry && p.industry !== filters.industry) return false;
      if (filters.software && p.software !== filters.software) return false;
      if (filters.machine && p.machine !== filters.machine) return false;
      if (filters.year && String(p.year) !== filters.year) return false;
      if (filters.tags && !p.tags.includes(filters.tags)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "newest": return b.year - a.year;
        case "oldest": return a.year - b.year;
        case "alpha": return a.title.localeCompare(b.title);
        case "views": return b.views - a.views;
        case "featured": return Number(b.featured) - Number(a.featured) || b.year - a.year;
      }
    });
    return list;
  }, [query, filters, sort]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!active) return;
      const pool = results.length ? results : PROJECTS;
      const i = pool.findIndex((p) => p.slug === active.slug);
      setActive(pool[(i + dir + pool.length) % pool.length]);
    },
    [active, results],
  );

  const anyFilter = Object.values(filters).some(Boolean) || query.trim().length > 0;

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#0B0F14" }}>
      {!introDone && <PortfolioIntro onDone={() => setIntroDone(true)} />}

      {/* blueprint background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(90,169,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90,169,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(90,169,255,0.16), transparent 60%)" }}
      />
      {/* drifting particles */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-px w-px rounded-full bg-[#5aa9ff]"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, boxShadow: "0 0 8px 2px rgba(90,169,255,0.35)" }}
            animate={{ y: [0, -40, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: 9 + (i % 5) * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="relative">
        <Navigation />

        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: introDone ? 1 : 0, y: introDone ? 0 : 18 }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          >
            <div className="font-mono text-[10px] tracking-[0.4em] text-[#5aa9ff]">TOREO · ENGINEERING ARCHIVE</div>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-white sm:text-6xl">
              Every project, opened as a CAD file.
            </h1>
            <p className="mt-4 max-w-2xl text-white/50">
              Real parts we designed, cut, bent, welded, printed and shipped. Open any file to rotate the model,
              explode the assembly and read the full engineering record.
            </p>
          </motion.header>

          {/* controls */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects, materials, machines…"
                  aria-label="Search projects"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F14]/70 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/25 focus:border-[#5aa9ff]/60 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/60 hover:text-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </button>
              <div className="flex flex-wrap gap-1.5">
                {SORTS.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => setSort(s.k)}
                    className={`rounded-lg border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                      sort === s.k
                        ? "border-[#5aa9ff]/60 bg-[#5aa9ff]/15 text-[#9cccff]"
                        : "border-white/10 text-white/45 hover:text-white/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 sm:grid-cols-4 lg:grid-cols-7"
              >
                {FILTER_KEYS.map((key) => (
                  <label key={key} className="block">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">{key}</span>
                    <select
                      value={filters[key]}
                      onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0F14] px-2 py-2 text-xs text-white/80 focus:border-[#5aa9ff]/60 focus:outline-none"
                    >
                      <option value="">All</option>
                      {FILTER_FIELDS[key].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </motion.div>
            )}
          </div>

          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            {results.length} file{results.length === 1 ? "" : "s"}
          </div>

          {results.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p, i) => (
                <ProjectCard key={p.slug} project={p} index={i} onOpen={setActive} />
              ))}
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <svg viewBox="-60 -40 120 80" className="mx-auto h-32 w-64 opacity-50">
                <g stroke="#5aa9ff" strokeWidth="0.7" fill="none" strokeDasharray="3 3">
                  <rect x="-40" y="-24" width="80" height="48" rx="3" />
                  <line x1="-40" y1="0" x2="40" y2="0" />
                  <line x1="0" y1="-24" x2="0" y2="24" />
                  <circle cx="0" cy="0" r="12" />
                </g>
              </svg>
              <h2 className="mt-6 font-display text-2xl text-white">No files match this search</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
                {anyFilter
                  ? "Clear the filters, or send us your drawing — most of what we build starts as a sketch nobody has cut before."
                  : "The archive is being prepared. Send us your drawing and we will engineer it from scratch."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {anyFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilters({ material: "", technology: "", industry: "", software: "", machine: "", year: "", tags: "" });
                    }}
                    className="rounded-lg border border-white/15 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
                <a
                  href="/request"
                  className="rounded-lg bg-[#5aa9ff] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#06121f] hover:opacity-90"
                >
                  Upload CAD &amp; Request a Quote
                </a>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>

      <ProjectViewerHost
        project={active}
        onClose={() => setActive(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </div>
  );
}
