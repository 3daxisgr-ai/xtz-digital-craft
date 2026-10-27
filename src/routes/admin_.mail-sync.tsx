import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  mailSyncOverview,
  mailSyncGetRun,
  mailSyncRun,
  mailSyncUpdateSettings,
} from "@/lib/api/mail-sync.functions";

export const Route = createFileRoute("/admin_/mail-sync")({
  ssr: false,
  head: () => ({
    meta: [{ title: "TOREO — Email → Notion" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: MailSyncPage,
});

const ACTION_LABEL: Record<string, string> = {
  create_order: "Νέα εγγραφή",
  update_order: "Ενημέρωση εγγραφής",
  join_new: "Ίδιο νήμα με νέα εγγραφή",
  mark_replied: "→ Replied",
  log_only: "Μόνο καταγραφή",
  forward_logged: "Προώθηση σε τρίτο",
  manual_review: "Χειροκίνητος έλεγχος",
  skip: "Παράλειψη",
  already_done: "Ήδη καταχωρημένο",
  error: "Σφάλμα",
};
const ACTION_STYLE: Record<string, string> = {
  create_order: "bg-emerald-400/20 text-emerald-200",
  update_order: "bg-sky-400/20 text-sky-200",
  join_new: "bg-sky-400/20 text-sky-200",
  mark_replied: "bg-emerald-400/20 text-emerald-200",
  log_only: "bg-white/10 text-white/70",
  forward_logged: "bg-white/10 text-white/70",
  manual_review: "bg-amber-400/20 text-amber-200",
  skip: "bg-white/5 text-white/40",
  already_done: "bg-white/5 text-white/40",
  error: "bg-red-500/20 text-red-200",
};

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" });
}

function Report({ r }: { r: any }) {
  const rep = r.report ?? r;
  const items: any[] = rep.items ?? [];
  return (
    <div className="space-y-3 text-sm">
      {r.error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200">
          {r.error}
        </div>
      )}
      {(rep.schemaProblems ?? []).length > 0 && (
        <div className="rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100">
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1">Δομή Notion</div>
          <ul className="list-disc pl-5">
            {rep.schemaProblems.map((p: string) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {rep.probe && (
        <div className="rounded border border-white/10 px-3 py-2 text-white/80">
          Σύνδεση: <b>{rep.transport ?? r.transport}</b> · Φάκελοι: {rep.probe.folders.join(", ")} ·
          Απεσταλμένα: <b>{rep.probe.sentFolder ?? "δεν βρέθηκε"}</b>
        </div>
      )}
      {(rep.folders ?? []).length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {rep.folders.map((f: any) => (
            <div
              key={f.folder}
              className="rounded border border-white/10 px-3 py-2 text-white/70 text-xs font-mono"
            >
              <div className="text-white">
                {f.kind === "inbox" ? "Εισερχόμενα" : "Απεσταλμένα"} ({f.folder})
              </div>
              {f.exists} μηνύματα · νέα προς έλεγχο: {f.pending} · σε αυτή την εκτέλεση: {f.taken}
              {f.initialized && (
                <div className="text-amber-200/80">
                  Πρώτη εκτέλεση: ξεκινά από τις τελευταίες ημέρες
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/40 font-mono uppercase tracking-widest text-[10px]">
              <tr>
                <th className="text-left p-2">Φάκελος</th>
                <th className="text-left p-2">Ημ/νία</th>
                <th className="text-left p-2">Από / Προς</th>
                <th className="text-left p-2">Θέμα</th>
                <th className="text-left p-2">Ενέργεια</th>
                <th className="text-left p-2">Λεπτομέρειες</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, k) => (
                <tr key={k} className="border-t border-white/5 align-top">
                  <td className="p-2 text-white/50">{i.folder === "inbox" ? "IN" : "SENT"}</td>
                  <td className="p-2 text-white/60 whitespace-nowrap">{fmt(i.date)}</td>
                  <td className="p-2 text-white/80">{i.folder === "inbox" ? i.from : i.to}</td>
                  <td className="p-2 text-white">{i.subject || "(χωρίς θέμα)"}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase whitespace-nowrap ${ACTION_STYLE[i.action] ?? ""}`}
                    >
                      {ACTION_LABEL[i.action] ?? i.action}
                    </span>
                  </td>
                  <td className="p-2 text-white/60">
                    {i.reason}
                    {i.setStatus && (
                      <div className="text-emerald-200/80">Κατάσταση → {i.setStatus}</div>
                    )}
                    {i.error && <div className="text-red-300">{i.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length === 0 && !rep.probe && !r.error && (
        <div className="text-white/50">Δεν υπάρχουν νέα μηνύματα.</div>
      )}
    </div>
  );
}

function MailSyncPage() {
  const overview = useServerFn(mailSyncOverview);
  const getRun = useServerFn(mailSyncGetRun);
  const run = useServerFn(mailSyncRun);
  const update = useServerFn(mailSyncUpdateSettings);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [actor, setActor] = useState("");

  async function reload() {
    try {
      setData(await overview());
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  async function doRun(mode: "probe" | "dry" | "live") {
    if (mode === "live" && !confirm("Ζωντανή εκτέλεση: θα γίνουν εγγραφές στο Notion. Συνέχεια;"))
      return;
    setBusy(mode);
    setResult(null);
    try {
      setResult(await run({ data: { mode } }));
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setBusy(null);
      reload();
    }
  }

  async function toggle(key: "live_writes" | "website_hook", value: boolean) {
    if (actor.trim().length < 2) {
      alert("Γράψε πρώτα το όνομά σου (καταγράφεται ποιος άλλαξε τη ρύθμιση).");
      return;
    }
    const label =
      key === "live_writes" ? "Ζωντανές εγγραφές email → Notion" : "Φόρμα site → Notion";
    if (!confirm(`${value ? "Ενεργοποίηση" : "Απενεργοποίηση"}: ${label};`)) return;
    try {
      await update({ data: { actor: actor.trim(), [key]: value } });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (err === "Unauthorized") {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center p-6">
        <div className="text-center space-y-3">
          <p>Χρειάζεται σύνδεση στο admin.</p>
          <a
            href="/admin"
            className="inline-block rounded bg-amber-300 px-4 py-2 text-black font-mono text-xs uppercase tracking-widest"
          >
            Σύνδεση
          </a>
        </div>
      </div>
    );
  }

  const s = data?.settings;
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a
              href="/admin"
              className="text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white"
            >
              ← Admin
            </a>
            <h1 className="text-2xl font-bold mt-1">Email info@toreo.gr → Notion</h1>
            <p className="text-white/50 text-sm">
              Το mailbox ανοίγει μόνο για ανάγνωση. Καμία αποστολή, διαγραφή ή μετακίνηση email.
            </p>
          </div>
          <div className="flex gap-2 text-[10px] font-mono uppercase tracking-widest">
            <span
              className={`px-2 py-1 rounded ${data?.configured?.email ? "bg-emerald-400/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}
            >
              Email {data?.configured?.email ? "OK" : "—"}
            </span>
            <span
              className={`px-2 py-1 rounded ${data?.configured?.notion ? "bg-emerald-400/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}
            >
              Notion {data?.configured?.notion ? "OK" : "—"}
            </span>
          </div>
        </div>

        {err && err !== "Unauthorized" && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
            {err}
          </div>
        )}

        <section className="rounded border border-white/10 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!!busy}
              onClick={() => doRun("probe")}
              className="rounded border border-white/20 px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-white/5 disabled:opacity-40"
            >
              {busy === "probe" ? "…" : "Δοκιμή σύνδεσης"}
            </button>
            <button
              disabled={!!busy}
              onClick={() => doRun("dry")}
              className="rounded bg-amber-300 text-black px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest hover:bg-amber-200 disabled:opacity-40"
            >
              {busy === "dry" ? "Εκτέλεση…" : "Εκτέλεση dry-run"}
            </button>
            <button
              disabled={!!busy || !s?.live_writes}
              onClick={() => doRun("live")}
              title={s?.live_writes ? "" : "Ενεργοποίησε πρώτα τις ζωντανές εγγραφές"}
              className="rounded border border-emerald-400/50 text-emerald-200 px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-emerald-400/10 disabled:opacity-30"
            >
              {busy === "live" ? "Εκτέλεση…" : "Ζωντανή εκτέλεση"}
            </button>
          </div>
          <p className="text-xs text-white/40">
            Το dry-run διαβάζει email και Notion και δείχνει τι θα γινόταν, χωρίς καμία αλλαγή. Ανά
            εκτέλεση: έως {s?.max_per_folder ?? "—"} μηνύματα ανά φάκελο· πρώτη εκτέλεση: τελευταίες{" "}
            {s?.lookback_days ?? "—"} ημέρες.
          </p>
          {result && <Report r={result} />}
        </section>

        <section className="rounded border border-white/10 p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">Ρυθμίσεις</h2>
          <label className="block max-w-xs">
            <span className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1">
              Το όνομά σου (για καταγραφή αλλαγών)
            </span>
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded px-2 py-1.5 text-sm"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ["live_writes", "Ζωντανές εγγραφές email → Notion", "Κλειστό: μόνο dry-run."],
                [
                  "website_hook",
                  "Φόρμα site → Notion",
                  "Κάθε νέα υποβολή φόρμας δημιουργεί εγγραφή στο Notion. Αν το Notion αποτύχει, η φόρμα δουλεύει κανονικά.",
                ],
              ] as const
            ).map(([key, label, help]) => (
              <div
                key={key}
                className="rounded border border-white/10 p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-sm">{label}</div>
                  <div className="text-xs text-white/40">{help}</div>
                </div>
                <button
                  onClick={() => toggle(key, !s?.[key])}
                  className={`shrink-0 rounded px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest ${s?.[key] ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/60"}`}
                >
                  {s?.[key] ? "Ενεργό" : "Ανενεργό"}
                </button>
              </div>
            ))}
          </div>
          {s?.updated_by && (
            <p className="text-xs text-white/40">
              Τελευταία αλλαγή: {s.updated_by} · {fmt(s.updated_at)}
            </p>
          )}
          <p className="text-xs text-white/40">
            Η προγραμματισμένη αυτόματη εκτέλεση δεν είναι ενεργή.
          </p>
        </section>

        <section className="rounded border border-white/10 p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
            Χειροκίνητος έλεγχος & αποτυχίες
          </h2>
          {(data?.review ?? []).length === 0 ? (
            <p className="text-sm text-white/40">Καμία εκκρεμότητα.</p>
          ) : (
            <ul className="divide-y divide-white/5 text-sm">
              {data.review.map((m: any) => (
                <li key={m.id} className="py-2">
                  <span
                    className={`mr-2 px-2 py-0.5 rounded font-mono text-[10px] uppercase ${m.status === "failed" ? "bg-red-500/20 text-red-200" : "bg-amber-400/20 text-amber-200"}`}
                  >
                    {m.status === "failed" ? "Αποτυχία" : "Έλεγχος"}
                  </span>
                  <span className="text-white/60">{fmt(m.sent_at)}</span> ·{" "}
                  {m.direction === "outgoing"
                    ? `Προς ${m.to_emails?.[0] ?? "—"}`
                    : `Από ${m.from_email ?? "—"}`}{" "}
                  · <b>{m.subject || "(χωρίς θέμα)"}</b>
                  <div className="text-xs text-white/50">{m.error ?? m.match_reason}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded border border-white/10 p-4 space-y-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">
            Ιστορικό εκτελέσεων
          </h2>
          {(data?.runs ?? []).map((r: any) => (
            <button
              key={r.id}
              onClick={async () => {
                try {
                  setResult(await getRun({ data: { id: r.id } }));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              className="w-full text-left flex flex-wrap items-center gap-3 rounded px-2 py-1.5 hover:bg-white/5 text-xs"
            >
              <span
                className={`px-2 py-0.5 rounded font-mono uppercase ${r.ok ? "bg-emerald-400/20 text-emerald-200" : r.ok === false ? "bg-red-500/20 text-red-200" : "bg-white/10"}`}
              >
                {r.mode}
              </span>
              <span className="text-white/60">{fmt(r.started_at)}</span>
              <span className="text-white/40">{r.trigger}</span>
              <span className="text-white/70">
                {Object.entries(r.counts ?? {})
                  .map(([k, v]) => `${ACTION_LABEL[k] ?? k}: ${v}`)
                  .join(" · ")}
              </span>
              {r.error && <span className="text-red-300 truncate max-w-md">{r.error}</span>}
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
