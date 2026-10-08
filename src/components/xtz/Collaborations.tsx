import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useI18n } from "./i18n";
import { CLIENTS, type Client } from "./clients";

function LogoPlate({ client, className = "" }: { client: Client; className?: string }) {
  // Logos kept untouched on a neutral white plate so original colours are preserved.
  return (
    <div className={`flex items-center justify-center rounded-md bg-white px-5 py-3 ${className}`}>
      <img src={client.logo} alt={`${client.name} logo`} className="h-full w-auto max-w-full object-contain" />
    </div>
  );
}

export function Collaborations() {
  const { lang } = useI18n();
  const L = lang === "GR" ? "GR" : "EN";
  const [active, setActive] = useState<Client | null>(null);

  return (
    <section id="collaborations" aria-labelledby="collab-title" className="relative w-full py-24 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <header className="mb-14 md:mb-20 max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-6">
            {L === "GR" ? "Συνεργασίες" : "Clients & Partners"}
          </div>
          <h2 id="collab-title" className="font-display font-bold leading-[0.9] text-[clamp(2.4rem,6vw,5rem)] tracking-tighter mb-6">
            {L === "GR" ? "Επιλεγμένες Συνεργασίες" : "Selected Collaborations"}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg leading-relaxed font-light">
            {L === "GR"
              ? "Μας εμπιστεύονται εταιρείες που εκτιμούν την ακρίβεια, την ποιότητα και την αξιόπιστη κατασκευή."
              : "Trusted by companies that value precision, quality and reliable manufacturing."}
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {CLIENTS.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActive(c)}
                className="group block w-full text-left overflow-hidden rounded-lg border border-primary/15 bg-card/40 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={`${c.name} — TOREO collaboration`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center"><LogoPlate client={c} className="h-20" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                  <LogoPlate client={c} className="absolute left-5 bottom-5 h-14 shadow-lg" />
                </div>
                <div className="flex items-end justify-between gap-6 p-6 md:p-8">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2">{c.category[L]}</div>
                    <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{c.name}</h3>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm text-foreground/60 transition-colors group-hover:text-primary">
                    {L === "GR" ? "Δείτε τη συνεργασία" : "View collaboration"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl w-[100vw] sm:w-[95vw] h-[100svh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 gap-0 border-primary/20 [&>button:last-child]:hidden">
          {active && (
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
                  <LogoPlate client={active} className="h-16" />
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-1">{active.label[L]}</div>
                    <DialogTitle className="font-display text-3xl md:text-4xl font-bold tracking-tight">{active.name}</DialogTitle>
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
              </div>
            </article>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
