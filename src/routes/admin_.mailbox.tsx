import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  mailboxStatus,
  mailboxTest,
  mailboxList,
  mailboxMessage,
  mailboxSmtpCheck,
} from "@/lib/api/mailbox.functions";

export const Route = createFileRoute("/admin_/mailbox")({
  ssr: false,
  head: () => ({
    meta: [{ title: "TOREO — Mailbox (read-only)" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: MailboxPage,
});

type Status = Awaited<ReturnType<typeof mailboxStatus>>;
type TestRes = Awaited<ReturnType<typeof mailboxTest>>;
type ListRes = Awaited<ReturnType<typeof mailboxList>>;
type MsgRes = Awaited<ReturnType<typeof mailboxMessage>>;
type SmtpRes = Awaited<ReturnType<typeof mailboxSmtpCheck>>;

const btn =
  "rounded border border-white/20 px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-white/5 disabled:opacity-40";
const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" }) : "—";
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Fail({ r }: { r: { ok: false; error: string } }) {
  return (
    <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
      {r.error}
    </div>
  );
}

function MailboxPage() {
  const status = useServerFn(mailboxStatus);
  const test = useServerFn(mailboxTest);
  const list = useServerFn(mailboxList);
  const getMsg = useServerFn(mailboxMessage);
  const smtp = useServerFn(mailboxSmtpCheck);

  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testRes, setTestRes] = useState<TestRes | null>(null);
  const [folder, setFolder] = useState("INBOX");
  const [listRes, setListRes] = useState<ListRes | null>(null);
  const [msg, setMsg] = useState<MsgRes | null>(null);
  const [smtpRes, setSmtpRes] = useState<SmtpRes | null>(null);

  useEffect(() => {
    status()
      .then(setSt)
      .catch((e) => setErr(errMsg(e)));
  }, [status]);

  async function act<T>(key: string, fn: () => Promise<T>, set: (v: T) => void) {
    setBusy(key);
    try {
      set(await fn());
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  if (err === "Unauthorized")
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center p-6">
        <a href="/admin" className="rounded bg-amber-300 px-4 py-2 text-black font-mono text-xs uppercase tracking-widest">
          Σύνδεση στο admin
        </a>
      </div>
    );

  const folders = testRes?.ok ? testRes.data.folders : [];
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <a href="/admin" className="text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white">
            ← Admin
          </a>
          <h1 className="text-2xl font-bold mt-1">Mailbox {st?.account ?? "info@toreo.gr"}</h1>
          <p className="text-white/50 text-sm">
            Μόνο ανάγνωση: τα μηνύματα δεν σημειώνονται ως διαβασμένα, δεν μετακινούνται, δεν διαγράφονται και δεν
            αποθηκεύονται. Καμία αποστολή email.
          </p>
          <div className="mt-2 flex gap-2 text-[10px] font-mono uppercase tracking-widest">
            <span className={`px-2 py-1 rounded ${st?.secretConfigured ? "bg-emerald-400/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
              Κωδικός {st?.secretConfigured ? "αποθηκευμένος" : "λείπει"}
            </span>
            <span className="px-2 py-1 rounded bg-white/10 text-white/70">IMAP {st?.imap ?? "…"}</span>
            <span className="px-2 py-1 rounded bg-white/10 text-white/70">SMTP {st?.smtp ?? "…"}</span>
          </div>
        </div>
        {err && <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200 text-sm">{err}</div>}

        <section className="rounded border border-white/10 p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">1 · Δοκιμή σύνδεσης IMAP</h2>
          <button disabled={!!busy} className={btn} onClick={() => act("test", () => test(), setTestRes)}>
            {busy === "test" ? "…" : "Δοκιμή σύνδεσης"}
          </button>
          {testRes && !testRes.ok && <Fail r={testRes} />}
          {testRes?.ok && (
            <div className="text-sm text-white/80 space-y-1">
              <div className="text-emerald-300">✓ Συνδέθηκε ({testRes.data.ms} ms, {testRes.data.transport})</div>
              <div>Εισερχόμενα: {testRes.data.inbox.exists} μηνύματα</div>
              <div className="text-white/60">
                Φάκελοι:{" "}
                {testRes.data.folders.map((f) => `${f.name}${f.exists != null ? ` (${f.exists})` : ""}`).join(" · ")}
              </div>
            </div>
          )}
        </section>

        <section className="rounded border border-white/10 p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">2 · Μηνύματα</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="bg-black/40 border border-white/15 rounded px-2 py-1.5 text-sm"
            >
              {(folders.length ? folders.map((f) => f.name) : ["INBOX"]).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              disabled={!!busy}
              className={btn}
              onClick={() => act("list", () => list({ data: { folder, limit: 25 } }), (r) => (setListRes(r), setMsg(null)))}
            >
              {busy === "list" ? "…" : "Φόρτωση"}
            </button>
            {listRes?.ok && listRes.data.nextBeforeUid && (
              <button
                disabled={!!busy}
                className={btn}
                onClick={() =>
                  act(
                    "list",
                    () => list({ data: { folder, limit: 25, beforeUid: listRes.data.nextBeforeUid! } }),
                    setListRes,
                  )
                }
              >
                Παλαιότερα
              </button>
            )}
          </div>
          {listRes && !listRes.ok && <Fail r={listRes} />}
          {listRes?.ok && (
            <div className="divide-y divide-white/10 text-sm">
              <div className="text-xs text-white/40 pb-2">{listRes.data.total} συνολικά στον φάκελο</div>
              {listRes.data.rows.map((r) => (
                <button
                  key={r.uid}
                  disabled={!!busy}
                  onClick={() => act("msg", () => getMsg({ data: { folder, uid: r.uid } }), setMsg)}
                  className="w-full text-left py-2 hover:bg-white/5 grid sm:grid-cols-[9rem_14rem_1fr] gap-x-3"
                >
                  <span className="text-white/50">{fmt(r.date)}</span>
                  <span className="truncate">{r.from?.name || r.from?.email || "—"}</span>
                  <span className="truncate">
                    {r.subject || "(χωρίς θέμα)"}
                    {r.attachments.length > 0 && <span className="text-white/40"> · 📎 {r.attachments.length}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          {busy === "msg" && <div className="text-white/50 text-sm">Άνοιγμα…</div>}
          {msg && !msg.ok && <Fail r={msg} />}
          {msg?.ok && (
            <article className="rounded border border-white/15 p-4 space-y-2 text-sm">
              <h3 className="text-lg font-semibold">{msg.data.subject || "(χωρίς θέμα)"}</h3>
              <div className="text-white/60">
                Από: {msg.data.from.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(", ")}
                <br />
                Προς: {msg.data.to.map((a) => a.email).join(", ")}
                {msg.data.cc.length > 0 && <> · Κοιν.: {msg.data.cc.map((a) => a.email).join(", ")}</>}
                <br />
                {fmt(msg.data.date)}
              </div>
              {msg.data.attachments.length > 0 && (
                <div className="text-white/60">
                  Συνημμένα: {msg.data.attachments.map((a) => `${a.filename} (${Math.round(a.bytes / 1024)} KB)`).join(", ")}
                </div>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans text-white/90 max-h-[60vh] overflow-auto">
                {msg.data.text || "(Χωρίς κείμενο)"}
              </pre>
              {msg.data.truncated && <div className="text-amber-200 text-xs">Εμφανίζεται μόνο το αρχικό τμήμα του μηνύματος.</div>}
            </article>
          )}
        </section>

        <section className="rounded border border-white/10 p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/60">3 · Έλεγχος αποστολής (SMTP)</h2>
          <p className="text-xs text-white/40">
            Συνδέεται, ρωτά τι υποστηρίζει ο server, ελέγχει τον κωδικό και αποσυνδέεται. Δεν στέλνεται κανένα email.
          </p>
          <button disabled={!!busy} className={btn} onClick={() => act("smtp", () => smtp({ data: { verifyLogin: true } }), setSmtpRes)}>
            {busy === "smtp" ? "…" : "Έλεγχος SMTP"}
          </button>
          {smtpRes && !smtpRes.ok && <Fail r={smtpRes} />}
          {smtpRes?.ok && (
            <div className="text-sm text-white/80 space-y-1">
              <div>
                {smtpRes.data.host}:{smtpRes.data.port} — {smtpRes.data.reachable ? "προσβάσιμος" : "μη προσβάσιμος"} ({smtpRes.data.ms} ms)
              </div>
              {smtpRes.data.ehlo && (
                <div className="text-white/60">
                  Τρόποι σύνδεσης: {smtpRes.data.ehlo.auth.join(", ") || "—"} · Μέγιστο μέγεθος:{" "}
                  {smtpRes.data.ehlo.maxSize ? `${Math.round(smtpRes.data.ehlo.maxSize / 1048576)} MB` : "—"}
                </div>
              )}
              <div>
                Κωδικός SMTP:{" "}
                {{ ok: "✓ δεκτός", rejected: "✗ απορρίφθηκε", skipped: "δεν ελέγχθηκε", unsupported: "μη υποστηριζόμενος τρόπος", not_reached: "—" }[smtpRes.data.login]}
              </div>
              {smtpRes.data.error && <div className="text-red-300">{smtpRes.data.error}</div>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
