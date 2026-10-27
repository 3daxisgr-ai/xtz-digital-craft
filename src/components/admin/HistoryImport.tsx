// Admin section: historical import (website requests + mailbox) into the existing Notion databases.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  mailSyncApprovePreview,
  mailSyncHistory,
  mailSyncUpdateSettings,
} from "@/lib/api/mail-sync.functions";
import type { PreviewRow } from "@/lib/mail-sync/history";

interface HistoryView {
  ok?: boolean;
  runId?: string | null;
  mode?: string;
  counts?: Record<string, number>;
  rows?: PreviewRow[];
  remaining?: number;
  error?: string | null;
}

const LABEL: Record<string, string> = {
  new_record: "Νέα εγγραφή",
  attach: "Προσθήκη σε υπάρχουσα",
  duplicate: "Υπάρχει ήδη",
  skip: "Παράλειψη",
  manual_review: "Χειροκίνητος έλεγχος",
  error: "Σφάλμα",
};
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const day = (d: string) => new Date(d).toLocaleDateString("el-GR");

export function HistoryImport({
  actor,
  settings,
  onChange,
}: {
  actor: string;
  settings: {
    live_writes: boolean;
    history_import: boolean;
    history_cutoff: string;
    history_stale_days: number;
  } | null;
  onChange: () => void;
}) {
  const history = useServerFn(mailSyncHistory);
  const approve = useServerFn(mailSyncApprovePreview);
  const update = useServerFn(mailSyncUpdateSettings);
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<HistoryView | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [cutoff, setCutoff] = useState(settings?.history_cutoff ?? "2026-06-10");
  const [stale, setStale] = useState(settings?.history_stale_days ?? 60);
  const needActor = () => {
    if (actor.trim().length < 2) {
      alert("Γράψε πρώτα το όνομά σου στις Ρυθμίσεις.");
      return true;
    }
    return false;
  };

  async function go(
    key: string,
    data: { mode: "history_preview" | "history"; only?: "website" | "thread"; limit?: number },
  ) {
    if (
      data.mode === "history" &&
      !confirm("Εισαγωγή στο Notion: θα δημιουργηθούν εγγραφές. Συνέχεια;")
    )
      return;
    setBusy(key);
    setRes(null);
    try {
      setRes(await history({ data }));
    } catch (e) {
      setRes({ error: errMsg(e) });
    } finally {
      setBusy(null);
      onChange();
    }
  }

  async function saveSettings(patch: Record<string, unknown>, label: string) {
    if (needActor() || !confirm(label)) return;
    try {
      await update({ data: { actor: actor.trim(), ...patch } });
      onChange();
    } catch (e) {
      alert(errMsg(e));
    }
  }

  async function doApprove() {
    if (!res?.runId || needActor()) return;
    if (!confirm("Έγκριση αυτής της προεπισκόπησης για εισαγωγή (ισχύει 24 ώρες);")) return;
    try {
      await approve({ data: { runId: res.runId, actor: actor.trim() } });
      setApprovedId(res.runId);
    } catch (e) {
      alert(errMsg(e));
    }
  }

  const canImport = !!settings?.live_writes && !!settings?.history_import;
  const btn =
    "rounded border border-white/20 px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-white/5 disabled:opacity-30";

  return (
    <section className="rounded border border-white/10 p-4 space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
        Ιστορική εισαγωγή (site + email → Notion)
      </h2>
      <p className="text-xs text-white/50">
        1) Προεπισκόπηση (μόνο ανάγνωση) → 2) Έγκριση → 3) Πιλοτική εισαγωγή → 4) Εισαγωγή σε
        παρτίδες. Υπάρχουσες εγγραφές Notion δεν αλλάζουν κατάσταση. Δεν στέλνεται κανένα email.
      </p>
      <div className="flex flex-wrap items-end gap-3 text-xs">
        <label>
          <span className="block text-[10px] font-mono uppercase text-white/50 mb-1">
            Από ημερομηνία
          </span>
          <input
            type="date"
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
            className="rounded bg-white/5 border border-white/15 px-2 py-1"
          />
        </label>
        <label>
          <span className="block text-[10px] font-mono uppercase text-white/50 mb-1">
            «Needs Review» μετά από (ημέρες)
          </span>
          <input
            type="number"
            min={7}
            max={365}
            value={stale}
            onChange={(e) => setStale(Number(e.target.value))}
            className="w-24 rounded bg-white/5 border border-white/15 px-2 py-1"
          />
        </label>
        <button
          className={btn}
          onClick={() =>
            saveSettings(
              { history_cutoff: cutoff, history_stale_days: stale },
              "Αποθήκευση ρυθμίσεων εισαγωγής;",
            )
          }
        >
          Αποθήκευση
        </button>
        <button
          className={btn}
          onClick={() =>
            saveSettings(
              { history_import: !settings?.history_import },
              `${settings?.history_import ? "Απενεργοποίηση" : "Ενεργοποίηση"} ιστορικής εισαγωγής;`,
            )
          }
        >
          Ιστορική εισαγωγή: {settings?.history_import ? "ON" : "OFF"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={!!busy}
          className={btn}
          onClick={() => go("preview", { mode: "history_preview" })}
        >
          {busy === "preview" ? "…" : "Προεπισκόπηση"}
        </button>
        <button
          disabled={
            !res?.runId || res.mode !== "history_preview" || !res.ok || approvedId === res.runId
          }
          className={btn}
          onClick={doApprove}
        >
          {approvedId && approvedId === res?.runId ? "Εγκρίθηκε" : "Έγκριση προεπισκόπησης"}
        </button>
        <button
          disabled={!!busy || !canImport}
          className={btn}
          onClick={() => go("pw", { mode: "history", only: "website", limit: 5 })}
        >
          Πιλοτικά: 5 αιτήματα site
        </button>
        <button
          disabled={!!busy || !canImport}
          className={btn}
          onClick={() => go("pt", { mode: "history", only: "thread", limit: 1 })}
        >
          Πιλοτικά: 1 νήμα email
        </button>
        <button
          disabled={!!busy || !canImport}
          className={btn}
          onClick={() => go("batch", { mode: "history", limit: 20 })}
        >
          {busy === "batch" ? "…" : "Επόμενη παρτίδα (20)"}
        </button>
      </div>
      {!canImport && (
        <p className="text-[11px] text-white/40">
          Η εισαγωγή απαιτεί «Ζωντανές εγγραφές» και «Ιστορική εισαγωγή» ON, και εγκεκριμένη
          προεπισκόπηση από τις τελευταίες 24 ώρες.
        </p>
      )}
      {res && (
        <div className="space-y-2 text-sm">
          {res.error && (
            <div className="rounded bg-red-500/10 text-red-200 px-3 py-2">{res.error}</div>
          )}
          {res.counts && (
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(res.counts).map(([k, v]) => (
                <span key={k} className="rounded bg-white/10 px-2 py-1">
                  {LABEL[k] ?? k}: <b>{v}</b>
                </span>
              ))}
              {res.mode === "history" && (
                <span className="rounded bg-white/10 px-2 py-1">Υπόλοιπα: {res.remaining}</span>
              )}
            </div>
          )}
          <ul className="divide-y divide-white/5 max-h-96 overflow-auto text-xs">
            {(res.rows ?? []).map((r) => (
              <li key={r.key} className="py-1.5 flex flex-wrap gap-2">
                <span className="w-36 font-mono">{LABEL[r.action] ?? r.action}</span>
                <span className="text-white/50">{r.kind === "website" ? "Site" : "Email"}</span>
                <span>{day(r.firstDate)}</span>
                <span className="text-white/60">@{r.domain}</span>
                {r.record && <b>{r.record}</b>}
                {r.status && <span className="text-emerald-200">→ {r.status}</span>}
                <span className="text-white/40">
                  {r.messages} email · {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
