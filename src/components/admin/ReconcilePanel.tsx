// Admin section: one record per real request (site + email + replies) and the review queues.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { mailSyncReconcile } from "@/lib/api/mail-sync.functions";
import type { ReconcileResult, ReconcileRow } from "@/lib/mail-sync/canonical.server";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const day = (d: string) => (d ? new Date(d).toLocaleDateString("el-GR") : "—");

const COUNT_LABEL: Record<string, string> = {
  new_record: "Νέες εγγραφές",
  update: "Ενημερώσεις",
  unchanged: "Χωρίς αλλαγή",
  created: "Δημιουργήθηκαν",
  ids_assigned: "Νέα Order ID",
  status_changed: "Αλλαγές Status",
  log_created: "Νέα στο ιστορικό",
  log_updated: "Διορθώσεις ιστορικού",
  tasks_created: "Νέα tasks",
  tasks_done: "Tasks → Done",
  tasks_cancelled: "Διπλά tasks",
  duplicates: "Πιθανά διπλότυπα",
  duplicates_flagged: "Σημειώθηκαν διπλότυπα",
  review: "Για έλεγχο",
  skipped: "Παραλείφθηκαν",
  customer_links_fixed: "Διορθώθηκε σύνδεση πελάτη",
  customer_links_to_fix: "Σύνδεση πελάτη προς διόρθωση",
  error: "Σφάλματα",
};

/** Review queues shown separately so each one has a single, clear next action. */
const QUEUES: { id: string; title: string; hint: string; match: (r: ReconcileRow) => boolean }[] = [
  {
    id: "mismatch",
    title: "Λάθος σύνδεση πελάτη ↔ αιτήματος",
    hint: "Έλεγξε όνομα / email / κάρτα πελάτη στο αίτημα.",
    match: (r) =>
      r.action === "Customer mismatch" || r.action === "Needs review" || r.action === "correction",
  },
  {
    id: "nonorder",
    title: "Πιθανώς όχι παραγγελία (σύστημα / spam / προμηθευτής)",
    hint: "Αν δεν είναι αίτημα, άλλαξε το Order Check στο Notion.",
    match: (r) => r.action === "Suspected non-order",
  },
  {
    id: "mail",
    title: "Email χωρίς βέβαιη αντιστοίχιση",
    hint: "Σύνδεσέ το χειροκίνητα με το σωστό Order ID ή άφησέ το.",
    match: (r) => r.kind === "review" && r.action === "review",
  },
  {
    id: "supplier",
    title: "Απαντήσεις σε email της TOREO προς τρίτους (πιθανοί προμηθευτές)",
    hint: "Δεν δημιουργούν αίτημα. Αν κάποιο είναι πελάτης, δημιούργησε αίτημα χειροκίνητα.",
    match: (r) => r.action === "supplier",
  },
  {
    id: "contact",
    title: "Αβέβαιη κατηγορία επαφής",
    hint: "Όρισε Classification στην κάρτα του πελάτη.",
    match: (r) => r.action.startsWith("Πελάτης:"),
  },
];

export function ReconcilePanel({ liveWrites }: { liveWrites: boolean }) {
  const run = useServerFn(mailSyncReconcile);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [res, setRes] = useState<
    (ReconcileResult & { error: string | null }) | { error: string } | null
  >(null);

  async function go(apply: boolean) {
    if (
      apply &&
      !confirm(
        "Εφαρμογή στο Notion: Order ID, κατάσταση απάντησης, ιστορικό, tasks και ετικέτες ελέγχου. Δεν διαγράφεται και δεν συγχωνεύεται τίποτα. Συνέχεια;",
      )
    )
      return;
    setBusy(apply ? "apply" : "preview");
    setRes(null);
    try {
      setRes(await run({ data: { apply } }));
    } catch (e) {
      setRes({ error: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  const r = res && "rows" in res ? res : null;
  const btn =
    "rounded border border-white/20 px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-white/5 disabled:opacity-30";
  const counts = Object.entries(r?.counts ?? {}).filter(([k]) => COUNT_LABEL[k]);
  const checks = Object.entries(r?.counts ?? {}).filter(([k]) => k.startsWith("check:"));
  const contacts = Object.entries(r?.counts ?? {}).filter(([k]) => k.startsWith("contact:"));

  return (
    <section className="rounded border border-white/10 p-4 space-y-4">
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
          Ενοποίηση αιτημάτων · ένα αίτημα = μία εγγραφή = ένα Order ID
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Site, ειδοποίηση φόρμας, email πελάτη και απαντήσεις TOREO (Εισερχόμενα + Απεσταλμένα)
          ενώνονται στην ίδια εγγραφή. Ό,τι είναι αβέβαιο μπαίνει για έλεγχο — καμία αυτόματη
          συγχώνευση ή διαγραφή, κανένα email δεν στέλνεται.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={!!busy} onClick={() => go(false)}>
          {busy === "preview" ? "…" : "Προεπισκόπηση (μόνο ανάγνωση)"}
        </button>
        <button className={btn} disabled={!!busy || !liveWrites} onClick={() => go(true)}>
          {busy === "apply" ? "Εφαρμογή…" : "Εφαρμογή στο Notion"}
        </button>
      </div>
      {!liveWrites && (
        <p className="text-[11px] text-white/40">Η εφαρμογή απαιτεί «Ζωντανές εγγραφές» ON.</p>
      )}
      {res?.error && (
        <div className="rounded bg-red-500/10 text-red-200 px-3 py-2 text-sm">{res.error}</div>
      )}
      {r && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            {counts.map(([k, v]) => (
              <span key={k} className="rounded bg-white/10 px-2 py-1">
                {COUNT_LABEL[k]}: <b>{v}</b>
              </span>
            ))}
            {r.remaining > 0 && (
              <span className="rounded bg-amber-400/20 text-amber-100 px-2 py-1">
                Συνεχίζεται στην επόμενη εκτέλεση: {r.remaining}
              </span>
            )}
          </div>
          {(checks.length > 0 || contacts.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase text-white/50 mb-1">Αιτήματα</div>
                {checks.map(([k, v]) => (
                  <div key={k}>
                    {k.slice(6)}: <b>{v}</b>
                  </div>
                ))}
              </div>
              <div className="rounded border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase text-white/50 mb-1">Επαφές</div>
                {contacts.map(([k, v]) => (
                  <div key={k}>
                    {k.slice(8)}: <b>{v}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.duplicates.length > 0 && (
            <div className="rounded border border-amber-400/30 p-3">
              <div className="font-mono text-[10px] uppercase text-amber-200 mb-1">
                Πιθανά διπλότυπα ({r.duplicates.length}) — δεν συγχωνεύονται αυτόματα
              </div>
              <ul className="text-xs space-y-0.5">
                {r.duplicates.map((d) => (
                  <li key={d.order}>
                    <b>{d.order}</b> ↔ {d.candidates.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {QUEUES.map((q) => {
            const items = r.rows.filter(q.match);
            if (!items.length) return null;
            return (
              <div key={q.id} className="rounded border border-white/10 p-3">
                <div className="font-mono text-[10px] uppercase text-white/60">
                  {q.title} ({items.length})
                </div>
                <div className="text-[11px] text-white/40 mb-1">{q.hint}</div>
                <ul className="divide-y divide-white/5 text-xs max-h-64 overflow-auto">
                  {items.map((i, k) => (
                    <li key={`${i.key}-${k}`} className="py-1 flex flex-wrap gap-2">
                      <span className="text-white/50 w-20">{day(i.date)}</span>
                      <span className="text-white/60">@{i.domain}</span>
                      {i.order && <b>{i.order}</b>}
                      <span className="text-white/70">{i.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
