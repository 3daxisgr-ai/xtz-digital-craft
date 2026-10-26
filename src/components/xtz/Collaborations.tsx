import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useI18n } from "./i18n";
import { CLIENTS, type Client, type ClientProject } from "./clients";
import { ProjectDetail, ProjectGrid } from "./PartnerProjects";
import { LogoPlate } from "./LogoPlate";
import { PartnerMarquee } from "./PartnerMarquee";

// Confirmed joint work only (see clients.ts) — never add claims that are not on record.
const PROOF: { GR: string; EN: string; partner: string }[] = [
  { partner: "METLEN", GR: "Γαλβανιζέ γωνίες για τη στήριξη φωτοβολταϊκών πάνελ", EN: "Galvanized angle brackets for mounting solar panels" },
  { partner: "HOTEMEDIA", GR: "Μεταλλικός σκελετός για τις βάσεις τηλεοράσεων του Cosmos", EN: "Metal frames for the TV stands at the Cosmos shopping center" },
  { partner: "SARIDIS", GR: "Σχεδιασμός και 3D εκτύπωση εξαρτημάτων για ψυκτικές μονάδες", EN: "Design and 3D printing of components for refrigeration units" },
];

export function Collaborations() {
  const { lang } = useI18n();
  const L = lang === "GR" ? "GR" : "EN";
  const [active, setActiveRaw] = useState<Client | null>(null);
  const [project, setProject] = useState<ClientProject | null>(null);
  const [jumpToProjects, setJumpToProjects] = useState(false);
  const setActive = (c: Client | null) => { setProject(null); setJumpToProjects(false); setActiveRaw(c); };
  // Every partner opens its own profile card (its own main image at the top);
  // joint projects are listed inside it and open from there.
  const openPartner = (c: Client) => {
    setProject(null);
    setJumpToProjects(false);
    setActiveRaw(c);
  };

  return (
    <section
      id="collaborations"
      aria-labelledby="collab-title"
      className="relative w-full overflow-hidden py-24 md:py-36"
    >
      {/* Ambient cool-blue glow, cheap radial gradients only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_40%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left: headline */}
          <header className="lg:col-span-6">
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-10 bg-primary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary">
                {L === "GR" ? "Συνεργάτες" : "Partners"}
              </span>
            </div>
            <h2 id="collab-title" className="font-display font-bold leading-[0.95] tracking-tighter text-[clamp(2.2rem,4.6vw,4.2rem)]">
              {L === "GR" ? (
                <>Όταν η ακρίβεια <span className="text-primary">δεν είναι επιλογή</span>, μας εμπιστεύονται.</>
              ) : (
                <>When precision <span className="text-primary">isn't optional</span>, they trust us.</>
              )}
            </h2>
          </header>

          {/* Right: what we have actually built together */}
          <div className="lg:col-span-6">
            <p className="mb-8 max-w-xl text-base md:text-lg font-light leading-relaxed text-foreground/70">
              {L === "GR"
                ? "Από τη στήριξη φωτοβολταϊκών μέχρι εμπορικά κέντρα και ψυκτικές μονάδες, τα εξαρτήματα της TOREO δουλεύουν καθημερινά εκεί όπου μετρούν η αντοχή, η ακρίβεια και η συνέπεια στην παράδοση."
                : "From solar panel mounting to shopping centers and refrigeration units, TOREO parts work every day where strength, precision and on-time delivery matter."}
            </p>
            <ol className="divide-y divide-border/40 border-y border-border/40">
              {PROOF.map((x, i) => (
                <li key={x.partner} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <span className="font-mono text-[11px] tracking-[0.3em] text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm md:text-base text-foreground/85">{x[L]}</span>
                  <span className="col-start-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:col-start-auto">{x.partner}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Partner strip — continuous; first tap stops it, the next tap opens the partner */}
        <div className="mt-16 md:mt-24 border-t border-border/40 pt-8">
          <PartnerMarquee clients={CLIENTS} L={L} onPartner={openPartner} />
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
              <ProjectDetail
                project={project}
                partnerName={active.name}
                L={L}
                onBack={() => { setJumpToProjects(true); setProject(null); }}
              />
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
