import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useI18n } from "./i18n";
import { CLIENTS, type Client, type ClientProject } from "./clients";
import { ProjectDetail, ProjectGrid } from "./PartnerProjects";
import { LogoPlate } from "./LogoPlate";
import { PartnerMarquee } from "./PartnerMarquee";

export function Collaborations() {
  const { lang } = useI18n();
  const L = lang === "GR" ? "GR" : "EN";
  const [active, setActiveRaw] = useState<Client | null>(null);
  const [project, setProject] = useState<ClientProject | null>(null);
  const [jumpToProjects, setJumpToProjects] = useState(false);
  const setActive = (c: Client | null) => { setProject(null); setJumpToProjects(false); setActiveRaw(c); };
  // From the partner strip: open the partner, landing on its projects when it has any.
  const openPartner = (c: Client) => {
    setIdx(CLIENTS.findIndex((x) => x.id === c.id));
    setProject(null);
    setJumpToProjects(!!c.projects?.length);
    setActiveRaw(c);
  };
  const [idx, setIdx] = useState(0);
  const N = CLIENTS.length;
  const go = (d: number) => setIdx((i) => (i + d + N) % N);
  const featured = CLIENTS[idx];

  return (
    <section
      id="collaborations"
      aria-labelledby="collab-title"
      className="relative w-full overflow-hidden py-24 md:py-36"
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
    >
      {/* Ambient cool-blue glow, cheap radial gradients only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_40%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* Left: copy */}
          <header className="lg:col-span-5">
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-10 bg-primary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary">
                {L === "GR" ? "Συνεργάτες" : "Partners"}
              </span>
            </div>
            <h2 id="collab-title" className="font-display font-bold leading-[0.95] tracking-tighter text-[clamp(2.2rem,4.6vw,4.2rem)] mb-6">
              {L === "GR" ? (
                <>Μαζί με <span className="text-primary">κορυφαίες εταιρείες</span>, δημιουργούμε το μέλλον.</>
              ) : (
                <>Together with <span className="text-primary">leading companies</span>, we build the future.</>
              )}
            </h2>
            <p className="mb-10 max-w-md text-base md:text-lg font-light leading-relaxed text-foreground/65">
              {L === "GR"
                ? "Μας εμπιστεύονται εταιρείες που εκτιμούν την ακρίβεια, την ποιότητα και την αξιόπιστη κατασκευή."
                : "Trusted by companies that value precision, quality and reliable manufacturing."}
            </p>
            <button
              type="button"
              onClick={() => setActive(featured)}
              className="group inline-flex items-center gap-3 rounded-full border border-primary/50 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-foreground transition-colors duration-300 hover:border-primary hover:bg-primary/10"
            >
              {L === "GR" ? "Δείτε τη συνεργασία" : "View collaboration"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
          </header>

          {/* Right: stacked cards */}
          <div className="relative lg:col-span-7 h-[460px] sm:h-[520px]" aria-live="polite">
            {CLIENTS.map((c, i) => {
              const off = (i - idx + N) % N; // 0 = featured, 1.. = behind
              const isF = off === 0;
              return (
                <article
                  key={c.id}
                  aria-hidden={!isF}
                  onClick={() => (isF ? setActive(c) : setIdx(i))}
                  style={{
                    transform: isF
                      ? "translate3d(0,0,0) scale(1)"
                      : `translate3d(${off * 9}%, ${-off * 5}%, 0) scale(${1 - off * 0.09})`,
                    zIndex: 10 - off,
                    opacity: isF ? 1 : Math.max(0, 0.55 - (off - 1) * 0.2),
                    filter: isF ? "none" : `blur(${off * 2}px)`,
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className={`absolute inset-y-0 left-0 w-full sm:w-[86%] cursor-pointer overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-md shadow-2xl transition-[transform,opacity,filter] duration-700 motion-reduce:transition-none will-change-transform ${
                    isF ? "border-primary/30" : "border-border/40"
                  }`}
                >
                  <div className="relative h-[55%] overflow-hidden">
                    {c.image ? (
                      <img src={c.image} alt={`${c.name} — TOREO collaboration`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center"><span className="font-display text-3xl font-bold tracking-[0.3em] text-foreground/70">{c.name}</span></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                    <span className="absolute right-4 top-4 font-mono text-[10px] text-foreground/50">{c.imageCredit}</span>
                  </div>
                  <div className="relative flex h-[45%] flex-col justify-between p-6 md:p-8">
                    <div>
                      <div className="mb-4 flex items-center gap-4">
                        <LogoPlate client={c} className="h-11 px-4 py-2" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{c.label[L]}</span>
                      </div>
                      <p className="line-clamp-3 text-sm md:text-base leading-relaxed text-foreground/75">{c.description[L]}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start text-sm text-primary">
                      {L === "GR" ? "Περισσότερα" : "More"} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5" />
                </article>
              );
            })}
          </div>
        </div>

        {/* Partner strip — continuous, pausable, draggable */}
        <div className="mt-16 md:mt-24 border-t border-border/40 pt-8">
          <PartnerMarquee
            clients={CLIENTS}
            L={L}
            activeId={featured.id}
            onPartner={openPartner}
          />
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl w-[100vw] sm:w-[95vw] h-[100svh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 gap-0 border-primary/20 [&>button:last-child]:hidden">
          {active && project && (
            <div className="relative">
              <DialogTitle className="sr-only">{project.title[L]}</DialogTitle>
              <DialogDescription className="sr-only">{project.description[L]}</DialogDescription>
              <DialogClose className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 text-foreground hover:bg-background">
                <X className="h-5 w-5" />
                <span className="sr-only">{L === "GR" ? "Κλείσιμο" : "Close"}</span>
              </DialogClose>
              <ProjectDetail project={project} partnerName={active.name} L={L} onBack={() => { setJumpToProjects(true); setProject(null); }} />
            </div>
          )}
          {active && !project && (
            <article>
              <div className="relative aspect-[16/9] bg-muted">
                {active.image ? (
                  <img src={active.image} alt={`${active.name} — TOREO collaboration`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><LogoPlate client={active} className="h-24" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <span className="absolute right-4 bottom-3 font-mono text-[10px] text-foreground/50">{active.imageCredit}</span>
                <DialogClose className="absolute right-4 top-4 rounded-full bg-background/80 p-2 text-foreground hover:bg-background">
                  <X className="h-5 w-5" />
                  <span className="sr-only">{L === "GR" ? "Κλείσιμο" : "Close"}</span>
                </DialogClose>
              </div>
              <div className="p-6 md:p-10 space-y-8">
                <div className="flex flex-wrap items-center gap-6">
                  {active.website ? (
                    <a href={active.website} target="_blank" rel="noopener noreferrer" aria-label={`${active.name} — official website`} className="transition-opacity hover:opacity-80">
                      <LogoPlate client={active} className="h-16" />
                    </a>
                  ) : (
                    <LogoPlate client={active} className="h-16" />
                  )}
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-1">{active.label[L]}</div>
                    <DialogTitle className="font-display text-3xl md:text-4xl font-bold tracking-tight">{active.name}</DialogTitle>
                    {active.location && <p className="mt-1 text-sm text-muted-foreground">{active.location[L]}</p>}
                  </div>
                </div>
                <DialogDescription className="text-base md:text-lg text-foreground/75 leading-relaxed">
                  {active.description[L]}
                </DialogDescription>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                      {L === "GR" ? "Τι παρέδωσε η TOREO" : "What TOREO delivered"}
                    </h4>
                    <p className="text-foreground/80 leading-relaxed">{active.delivered[L]}</p>
                    {active.status && (
                      <p className="mt-5 text-sm">
                        <span className="text-muted-foreground">{L === "GR" ? "Κατάσταση: " : "Status: "}</span>
                        <span className="text-primary">{active.status[L]}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                      {L === "GR" ? "Υπηρεσίες" : "Services"}
                    </h4>
                    <ul className="flex flex-wrap gap-2">
                      {active.services.map((s) => (
                        <li key={s.EN} className="rounded-full border border-primary/25 px-3 py-1 text-sm text-foreground/80">{s[L]}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {active.projects && active.projects.length > 0 && (
                  <ProjectGrid projects={active.projects} L={L} onOpen={setProject} scrollIntoViewOnMount={jumpToProjects} />
                )}
              </div>
            </article>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
