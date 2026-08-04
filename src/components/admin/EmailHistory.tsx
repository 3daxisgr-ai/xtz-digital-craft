// Admin email history UI — order timeline, details drawer, retry action and
// the dashboard delivery widget. Matches the existing admin design language
// (dark panels, mono micro-labels, amber accents).

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListOrderEmails,
  adminGetEmail,
  adminRetryEmail,
  adminEmailStats,
  type OrderEmailRow,
} from "@/lib/api/email-log.functions";

const TYPE_LABEL: Record<string, string> = {
  contact: "Contact",
  quote_confirmation: "Quote Confirmation",
  admin_notification: "Admin Notification",
  quote_sent: "Quote Sent",
  quote_accepted: "Quote Accepted",
  quote_declined: "Quote Declined",
  status_update: "Status Update",
  photo_approval: "Photo Approval",
  custom_message: "Custom Message",
  system_test: "System Test",
  other: "Other",
};

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    sent: "text-emerald-300 border-emerald-400/30",
    failed: "text-red-300 border-red-400/30",
    sending: "text-sky-300 border-sky-400/30",
    pending: "text-white/50 border-white/20",
  };
  return (
    <span className={`text-[9px] font-mono tracking-[0.2em] uppercase border px-1.5 py-0.5 rounded-sm ${map[s] ?? map.pending}`}>
      {s}
    </span>
  );
}

function ts(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" });
}

// ---------- ORDER EMAIL HISTORY ----------

export function OrderEmailHistory({ orderId, orderCode }: { orderId?: string | null; orderCode?: string | null }) {
  const list = useServerFn(adminListOrderEmails);
  const retry = useServerFn(adminRetryEmail);
  const [rows, setRows] = useState<OrderEmailRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await list({ data: { orderId: orderId ?? undefined, orderCode: orderCode ?? undefined } });
      setRows(r.rows);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => { refresh(); }, [orderId, orderCode]); // eslint-disable-line

  async function doRetry(id: string) {
    setBusy(id);
    setNote(null);
    try {
      const r = await retry({ data: { id } });
      setNote(r.ok ? "Retry sent successfully." : r.error ?? "Retry failed.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  if (!rows) return <div className="text-xs text-white/40 font-mono">LOADING EMAIL HISTORY…</div>;

  return (
    <section className="border border-white/10 rounded-sm bg-[#0f131a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/50 uppercase">Email History</h2>
        <button onClick={refresh} className="text-[10px] font-mono tracking-[0.3em] text-white/40 hover:text-white">REFRESH</button>
      </div>

      {note && <div className="mb-3 text-xs text-amber-300">{note}</div>}

      {rows.length === 0 ? (
        <div className="text-xs text-white/40">No emails recorded for this order yet.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((r) => (
            <div key={r.id} className="py-3 flex items-start gap-3">
              <button onClick={() => setOpenId(r.id)} className="flex-1 text-left group">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-amber-300/70 uppercase">
                    {TYPE_LABEL[r.email_type] ?? r.email_type}
                  </span>
                  <StatusBadge s={r.status} />
                  {r.retry_count > 0 && (
                    <span className="text-[9px] font-mono text-white/40">retries: {r.retry_count}</span>
                  )}
                </div>
                <div className="text-sm text-white/90 group-hover:text-white truncate">{r.subject}</div>
                <div className="text-[11px] text-white/40">
                  → {r.recipient} · {ts(r.sent_at ?? r.created_at)}
                  {r.http_status ? ` · HTTP ${r.http_status}` : ""}
                </div>
                {r.status === "failed" && r.error_message && (
                  <div className="text-[11px] text-red-300/80 mt-1 line-clamp-2">{r.error_message}</div>
                )}
              </button>
              {r.status === "failed" && (
                <button
                  onClick={() => doRetry(r.id)}
                  disabled={busy === r.id}
                  className="border border-amber-300/40 hover:border-amber-300 text-amber-200 rounded-sm px-3 py-1.5 text-[10px] font-mono tracking-[0.25em] disabled:opacity-40"
                >
                  {busy === r.id ? "RETRYING…" : "RETRY"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {openId && <EmailDetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
}

// ---------- DETAILS DRAWER ----------

function EmailDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const get = useServerFn(adminGetEmail);
  const [row, setRow] = useState<(OrderEmailRow & { html: string | null }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    get({ data: { id } })
      .then((r) => setRow(r.row))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full overflow-y-auto bg-[#0b0f16] border-l border-white/10 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/50 uppercase">Email Details</h2>
          <button onClick={onClose} className="text-[10px] font-mono tracking-[0.3em] text-white/40 hover:text-white">CLOSE ✕</button>
        </div>

        {err && <div className="text-xs text-red-300">{err}</div>}
        {!row && !err && <div className="text-xs text-white/40 font-mono">LOADING…</div>}

        {row && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge s={row.status} />
              <span className="font-mono text-[10px] tracking-[0.2em] text-amber-300/70 uppercase">
                {TYPE_LABEL[row.email_type] ?? row.email_type}
              </span>
            </div>

            <div className="text-lg text-white">{row.subject}</div>

            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-xs">
              {[
                ["Recipient", row.recipient],
                ["CC", row.cc],
                ["Sender", row.sender],
                ["Reply-To", row.reply_to],
                ["Provider", row.provider],
                ["Message ID", row.provider_message_id],
                ["HTTP status", row.http_status],
                ["Attachments", row.attachments_count],
                ["Retries", row.retry_count],
                ["Created", ts(row.created_at)],
                ["Last attempt", ts(row.last_attempt_at)],
                ["Delivered", ts(row.sent_at)],
                ["Order", row.order_code],
              ].map(([k, v]) => (
                <div key={String(k)} className="contents">
                  <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">{k}</dt>
                  <dd className="text-white/85 break-all">{v === null || v === undefined || v === "" ? "—" : String(v)}</dd>
                </div>
              ))}
            </dl>

            {row.error_message && (
              <div className="border border-red-400/30 rounded-sm p-3">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-red-300/80 mb-1">Provider error</div>
                <pre className="text-[11px] text-red-200/90 whitespace-pre-wrap break-all">{row.error_message}</pre>
              </div>
            )}

            {row.html && (
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">HTML preview</div>
                <iframe
                  title="Email preview"
                  srcDoc={row.html}
                  sandbox=""
                  className="w-full h-[520px] border border-white/10 rounded-sm bg-white"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- DASHBOARD WIDGET ----------

export function EmailDeliveryWidget() {
  const stats = useServerFn(adminEmailStats);
  const [s, setS] = useState<any | null>(null);
  useEffect(() => { stats().then(setS).catch(() => setS(null)); }, []); // eslint-disable-line

  return (
    <section className="border border-white/10 rounded-sm bg-[#0f131a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/50 uppercase">Email Delivery</h2>
        {s?.successRate != null && (
          <span className="text-[10px] font-mono tracking-[0.2em] text-emerald-300">{s.successRate}% SUCCESS</span>
        )}
      </div>
      {!s ? (
        <div className="text-xs text-white/40">Loading email metrics…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Sent Today", value: s.sentToday, color: "text-emerald-300" },
              { label: "Failed", value: s.failed, color: s.failed > 0 ? "text-red-300" : "text-white" },
              { label: "Pending", value: s.pending + s.sending, color: "text-sky-300" },
              { label: "Retry Queue", value: s.retryQueue, color: s.retryQueue > 0 ? "text-amber-300" : "text-white" },
            ].map((k) => (
              <div key={k.label} className="border border-white/10 rounded-sm bg-[#0b0f16] p-3">
                <div className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">{k.label}</div>
                <div className={`mt-1 text-2xl font-semibold font-mono ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-white/45">
            Last email sent:{" "}
            {s.lastSent
              ? `${s.lastSent.subject} → ${s.lastSent.recipient} · ${ts(s.lastSent.sent_at)}`
              : "—"}
          </div>
        </>
      )}
    </section>
  );
}
