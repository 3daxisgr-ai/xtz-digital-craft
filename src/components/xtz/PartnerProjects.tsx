import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { ClientProject } from "./clients";

type Lang = "EN" | "GR";

/** Grid of a partner's completed projects. Hover reveals the title; click opens the project. */
export function ProjectGrid({
  projects,
  L,
  onOpen,
}: {
  projects: ClientProject[];
  L: Lang;
  onOpen: (p: ClientProject) => void;
}) {
  return (
    <section aria-labelledby="partner-projects-title">
      <h4
        id="partner-projects-title"
        className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
      >
        {L === "GR" ? "Έργα που ολοκληρώσαμε μαζί" : "Projects completed together"}
      </h4>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const cover = p.photos[0];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p)}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/50 bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`${L === "GR" ? "Άνοιγμα έργου" : "Open project"}: ${p.title[L]}`}
              >
                {cover && (
                  <img
                    src={cover.src}
                    alt={cover.alt[L]}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
                    <Images className="h-3 w-3" /> {p.photos.length}
                  </span>
                  <p className="font-display text-lg font-bold leading-tight text-foreground transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none">
                    {p.title[L]}
                  </p>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/0 transition-all duration-500 group-hover:ring-primary/60" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Full project view: large gallery, thumbnails, title, description and TOREO's work. */
export function ProjectDetail({
  project,
  partnerName,
  L,
  onBack,
}: {
  project: ClientProject;
  partnerName: string;
  L: Lang;
  onBack: () => void;
}) {
  const [i, setI] = useState(0);
  const N = project.photos.length;
  const go = (d: number) => setI((x) => (x + d + N) % N);
  const photo = project.photos[i];

  useEffect(() => setI(0), [project.id]);

  return (
    <article
      className="animate-in fade-in duration-500 motion-reduce:animate-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.stopPropagation(); go(1); }
        if (e.key === "ArrowLeft") { e.stopPropagation(); go(-1); }
      }}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <div className="relative bg-muted">
          <div className="relative mx-auto aspect-[3/4] max-h-[78svh] w-full">
            {photo && (
              <img
                key={photo.src}
                src={photo.src}
                alt={photo.alt[L]}
                className="absolute inset-0 h-full w-full animate-in fade-in duration-500 object-contain motion-reduce:animate-none"
              />
            )}
          </div>
          {N > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={L === "GR" ? "Προηγούμενη φωτογραφία" : "Previous photo"}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-3 text-foreground backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={L === "GR" ? "Επόμενη φωτογραφία" : "Next photo"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-3 text-foreground backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-foreground/80 backdrop-blur-sm">
                {String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
              </span>
            </>
          )}
        </div>

        {/* Text + thumbnails */}
        <div className="flex flex-col gap-8 p-6 md:p-10">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
            {partnerName}
          </button>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              TOREO × {partnerName}
            </div>
            <h3 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              {project.title[L]}
            </h3>
          </div>
          <p className="text-base leading-relaxed text-foreground/75">{project.description[L]}</p>
          <div>
            <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              {L === "GR" ? "Τι κατασκεύασε η TOREO" : "What TOREO made"}
            </h4>
            <p className="leading-relaxed text-foreground/85">{project.work[L]}</p>
          </div>
          {N > 1 && (
            <ul className="grid grid-cols-5 gap-2">
              {project.photos.map((ph, k) => (
                <li key={ph.src}>
                  <button
                    type="button"
                    onClick={() => setI(k)}
                    aria-label={ph.alt[L]}
                    aria-current={k === i}
                    className={`block aspect-[3/4] w-full overflow-hidden rounded-md border transition-all duration-300 ${
                      k === i ? "border-primary opacity-100" : "border-border/40 opacity-50 hover:opacity-90"
                    }`}
                  >
                    <img src={ph.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
