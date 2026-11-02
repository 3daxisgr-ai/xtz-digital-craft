import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "./i18n";
import {
  CONSENT_OPEN_EVENT,
  NO_OPTIONAL,
  cleanupOptional,
  readConsent,
  saveConsent,
  subscribeConsent,
  type ConsentChoices,
  type ConsentMethod,
  type OptionalCategory,
} from "@/lib/consent";

type Copy = {
  tag: string;
  title: string;
  body: string;
  policy: string;
  accept: string;
  reject: string;
  settings: string;
  save: string;
  close: string;
  always: string;
  necessary: { name: string; desc: string };
  functional: { name: string; desc: string };
  analytics: { name: string; desc: string };
};

const COPY: Record<"GR" | "EN", Copy> = {
  GR: {
    tag: "Cookies · Απόρρητο",
    title: "Εσείς επιλέγετε τι αποθηκεύεται",
    body: "Χρησιμοποιούμε μόνο τα απαραίτητα για τη λειτουργία του ιστοτόπου. Με τη συγκατάθεσή σας, ενεργοποιούμε επίσης στατιστικά επισκεψιμότητας και μία λειτουργική προτίμηση. Μπορείτε να αλλάξετε την επιλογή σας οποτεδήποτε.",
    policy: "Πολιτική cookies",
    accept: "Αποδοχή όλων",
    reject: "Απόρριψη προαιρετικών",
    settings: "Ρυθμίσεις",
    save: "Αποθήκευση επιλογών",
    close: "Κλείσιμο ρυθμίσεων",
    always: "Πάντα ενεργά",
    necessary: { name: "Απαραίτητα", desc: "Ασφάλεια, φιλοξενία, σύνδεση στο portal, γλώσσα που επιλέξατε και η ίδια η επιλογή σας για τα cookies." },
    functional: { name: "Λειτουργικά", desc: "Θυμάται από ποιο σημείο ξεκίνησε το βίντεο της αρχικής σελίδας, ώστε την επόμενη φορά να ξεκινά από άλλο." },
    analytics: { name: "Στατιστικά", desc: "Μέτρηση επισκέψεων και σελίδων από την πλατφόρμα φιλοξενίας, με cookie «session-id» διάρκειας 30 λεπτών." },
  },
  EN: {
    tag: "Cookies · Privacy",
    title: "You choose what is stored",
    body: "We only use what the site needs to work. With your consent we also enable visit statistics and one functional preference. You can change your choice at any time.",
    policy: "Cookie policy",
    accept: "Accept all",
    reject: "Reject optional",
    settings: "Settings",
    save: "Save choices",
    close: "Close settings",
    always: "Always on",
    necessary: { name: "Necessary", desc: "Security, hosting, portal sign-in, the language you chose and your cookie choice itself." },
    functional: { name: "Functional", desc: "Remembers where the homepage video started, so next time it starts elsewhere." },
    analytics: { name: "Statistics", desc: "Visit and page counts by the hosting platform, using a 30-minute “session-id” cookie." },
  },
};

export function CookieConsent() {
  const { lang } = useI18n();
  const c = COPY[lang === "EN" ? "EN" : "GR"];
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"banner" | "settings">("banner");
  const [hasChoice, setHasChoice] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(NO_OPTIONAL);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const ids = useId();

  useEffect(() => {
    const rec = readConsent();
    cleanupOptional(rec);
    setHasChoice(!!rec);
    if (!rec) setOpen(true);

    const onOpen = () => {
      const cur = readConsent();
      returnFocus.current = document.activeElement as HTMLElement | null;
      setDraft(cur ? { functional: cur.categories.functional, analytics: cur.categories.analytics } : NO_OPTIONAL);
      setHasChoice(!!cur);
      setView("settings");
      setOpen(true);
      requestAnimationFrame(() => titleRef.current?.focus());
    };
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    const unsub = subscribeConsent((r) => {
      setHasChoice(!!r);
      if (r) setOpen(false);
    });
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
      unsub();
    };
  }, []);

  const close = () => {
    setOpen(false);
    setView("banner");
    returnFocus.current?.focus?.();
    returnFocus.current = null;
  };

  const decide = (method: ConsentMethod, choices: ConsentChoices = draft) => {
    saveConsent(method, choices);
    setHasChoice(true);
    close();
  };

  useEffect(() => {
    if (!open || !hasChoice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasChoice]);

  if (!open) return null;

  const optional: { key: OptionalCategory; copy: { name: string; desc: string } }[] = [
    { key: "functional", copy: c.functional },
    { key: "analytics", copy: c.analytics },
  ];

  const btn =
    "min-h-10 px-3 py-2 border border-border bg-secondary/70 text-secondary-foreground font-display text-[13px] leading-tight " +
    "transition-colors hover:border-primary/70 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-desc`}
      className="fixed z-[60] bottom-3 inset-x-3 sm:inset-x-auto sm:left-5 sm:bottom-5 sm:w-[440px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-border bg-popover/95 text-popover-foreground backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500"
      style={{ boxShadow: "var(--shadow-deep)" }}
    >
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">{c.tag}</span>
          {hasChoice && (
            <button
              type="button"
              onClick={close}
              aria-label={c.close}
              className="-m-2 p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <h2
          id={`${ids}-title`}
          ref={titleRef}
          tabIndex={-1}
          className="mt-3 font-display text-lg font-medium tracking-tight outline-none"
        >
          {c.title}
        </h2>
        <p id={`${ids}-desc`} className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {c.body}{" "}
          <Link to="/cookie-policy" className="text-foreground underline decoration-primary/60 underline-offset-4 hover:text-primary">
            {c.policy}
          </Link>
        </p>

        {view === "settings" && (
          <ul className="mt-5 divide-y divide-border border-y border-border">
            <li className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-sm">{c.necessary.name}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.necessary.desc}</p>
              </div>
              <span className="shrink-0 mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{c.always}</span>
            </li>
            {optional.map(({ key, copy }) => (
              <li key={key} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <label htmlFor={`${ids}-${key}`} className="font-display text-sm cursor-pointer">{copy.name}</label>
                  <p id={`${ids}-${key}-d`} className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.desc}</p>
                </div>
                <Switch
                  id={`${ids}-${key}`}
                  aria-describedby={`${ids}-${key}-d`}
                  checked={draft[key]}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, [key]: v === true }))}
                  className="mt-0.5"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button type="button" className={btn} onClick={() => decide("reject_optional", NO_OPTIONAL)}>
            {c.reject}
          </button>
          {view === "banner" ? (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setView("settings");
                requestAnimationFrame(() => titleRef.current?.focus());
              }}
            >
              {c.settings}
            </button>
          ) : (
            <button type="button" className={btn} onClick={() => decide("custom")}>
              {c.save}
            </button>
          )}
          <button type="button" className={btn} onClick={() => decide("accept_all")}>
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
