import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  docsListOrders, docsList, docsGet, docsCreate, docsSaveDraft, docsApprove, docsSend,
} from "@/lib/api/admin-docs.functions";
import {
  DOC_LABEL, type DocType, offerTotals, orderTotals, money, canEdit, canSend, ORDER_FORM_MAX_LINES,
} from "@/lib/admin-docs";

export const Route = createFileRoute("/admin_/documents")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Offer & Order Form PDFs" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: DocumentsPage,
});

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-white/10 text-white/80",
  approved: "bg-amber-400/20 text-amber-200",
  sending: "bg-sky-400/20 text-sky-200",
  sent: "bg-emerald-400/20 text-emerald-200",
  failed: "bg-red-500/20 text-red-200",
};
const STATUS_LABEL: Record<string, string> = { draft: "Draft", approved: "Approved", sending: "Sending…", sent: "Sent", failed: "Failed" };

function Badge({ s }: { s: string }) {
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${STATUS_STYLE[s] ?? ""}`}>{STATUS_LABEL[s] ?? s}</span>;
}

const inp = "w-full bg-black/40 border border-white/15 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1">{label}</span>{children}</label>;
}

function DocumentsPage() {
  const listOrders = useServerFn(docsListOrders);
  const list = useServerFn(docsList);
  const create = useServerFn(docsCreate);
  const [type, setType] = useState<DocType>("offer");
  const [orders, setOrders] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [orderId, setOrderId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { setDocs(await list({ data: {} })); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => {
    listOrders().then(setOrders).catch((e) => setErr(e.message));
    reload();
  }, []); // eslint-disable-line

  async function onCreate() {
    if (!orderId) return;
    setBusy(true); setErr(null);
    try { const r = await create({ data: { doc_type: type, order_id: orderId } }); await reload(); setOpenId(r.id); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (err === "Unauthorized") {
    return <div className="min-h-screen bg-[#07090d] text-white grid place-items-center"><a href="/admin" className="underline">Sign in to the admin panel first</a></div>;
  }

  const shown = docs.filter((d) => d.doc_type === type);

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-6">
        <a href="/admin" className="font-mono text-[10px] tracking-[0.4em] text-white/60 hover:text-white">← ADMIN</a>
        <h1 className="text-lg font-semibold">Offer & Order Form PDFs</h1>
      </header>

      <div className="px-6 py-5 space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1">Template</div>
            <div className="inline-flex rounded border border-white/15 overflow-hidden">
              {(["offer", "order_form"] as DocType[]).map((t) => (
                <button key={t} onClick={() => { setType(t); setOpenId(null); }}
                  className={`px-4 py-2 text-sm ${type === t ? "bg-amber-300 text-black font-semibold" : "text-white/70 hover:bg-white/5"}`}>
                  {DOC_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-[320px] flex-1 max-w-xl">
            <Field label="Customer / order">
              <select className={inp} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Select a customer…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.order_code} — {o.customer_name}{o.company ? ` (${o.company})` : ""} — {o.customer_email}</option>
                ))}
              </select>
            </Field>
          </div>
          <button disabled={!orderId || busy} onClick={onCreate}
            className="px-4 py-2 rounded bg-white text-black text-sm font-semibold disabled:opacity-40">
            {busy ? "Creating…" : `New ${DOC_LABEL[type]} draft`}
          </button>
        </div>
        {err && <div className="text-sm text-red-300">{err}</div>}

        <div className="grid lg:grid-cols-[300px_1fr] gap-5">
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">{DOC_LABEL[type]} documents</div>
            {shown.length === 0 && <div className="text-sm text-white/40">None yet.</div>}
            {shown.map((d) => (
              <button key={d.id} onClick={() => setOpenId(d.id)}
                className={`w-full text-left p-3 rounded border ${openId === d.id ? "border-amber-300 bg-white/[0.04]" : "border-white/10 hover:border-white/25"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm">{d.number}</span><Badge s={d.status} /></div>
                <div className="text-xs text-white/60 mt-1">{d.customer_name} · {d.customer_email}</div>
                {d.approved_by && <div className="text-[11px] text-white/40 mt-1">Approved by {d.approved_by} · {new Date(d.approved_at).toLocaleString("el-GR")}</div>}
                {d.sent_at && <div className="text-[11px] text-emerald-300/70">Sent {new Date(d.sent_at).toLocaleString("el-GR")} → {d.recipient}</div>}
              </button>
            ))}
          </div>
          <div>{openId ? <Editor key={openId} id={openId} onChanged={reload} /> : <div className="text-sm text-white/40 p-8 border border-dashed border-white/10 rounded">Pick a customer and create a draft, or open an existing document.</div>}</div>
        </div>
      </div>
    </div>
  );
}

function Editor({ id, onChanged }: { id: string; onChanged: () => void }) {
  const get = useServerFn(docsGet);
  const save = useServerFn(docsSaveDraft);
  const approve = useServerFn(docsApprove);
  const send = useServerFn(docsSend);
  const [doc, setDoc] = useState<any>(null);
  const [fields, setFields] = useState<any>(null);
  const [recipient, setRecipient] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approver, setApprover] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const timer = useRef<any>(null);
  const seq = useRef(0);

  useEffect(() => {
    get({ data: { id } }).then((d) => { setDoc(d); setFields(d.fields); setRecipient(d.recipient ?? d.customer_email ?? ""); })
      .catch((e) => setErr(e.message));
  }, [id]); // eslint-disable-line

  // Auto-refresh the DRAFT PDF shortly after any edit. Never sends.
  function update(patch: any) {
    setFields((f: any) => ({ ...f, ...patch }));
    setDirty(true);
  }
  useEffect(() => {
    if (!dirty || !fields) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const my = ++seq.current;
      setSaving(true); setErr(null);
      try {
        const d = await save({ data: { id, fields, recipient } });
        if (my === seq.current) { setDoc(d); setDirty(false); onChanged(); }
      } catch (e: any) { setErr(e.message); } finally { if (my === seq.current) setSaving(false); }
    }, 900);
    return () => clearTimeout(timer.current);
  }, [fields, recipient, dirty]); // eslint-disable-line

  if (!doc || !fields) return <div className="text-sm text-white/50">{err ?? "Loading…"}</div>;
  const editable = canEdit(doc.status);
  const ready = !dirty && !saving;

  async function onApprove() {
    setErr(null);
    try { await approve({ data: { id, approved_by: approver, pdf_sha256: doc.pdf_sha256 } }); setDoc(await get({ data: { id } })); onChanged(); }
    catch (e: any) { setErr(e.message); }
  }
  async function onSend() {
    if (sending) return;
    setSending(true); setErr(null);
    try {
      const r: any = await send({ data: { id, recipient, pdf_sha256: doc.pdf_sha256 } });
      if (!r.ok) setErr(r.error);
      setConfirmOpen(false);
    } catch (e: any) { setErr(e.message); }
    finally { setDoc(await get({ data: { id } })); onChanged(); setSending(false); }
  }

  const filename = `${doc.doc_type === "offer" ? "TOREO_PROSFORA" : "TOREO_DELTIO_PARAGGELIAS"}_${doc.number}.pdf`;

  return (
    <div className="grid xl:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono">{doc.number}</span><Badge s={doc.status} />
          <span className="text-xs text-white/50">{saving ? "Updating draft PDF…" : dirty ? "Unsaved changes" : "Draft PDF up to date"}</span>
        </div>
        {!editable && <div className="text-xs text-white/50">This document was {doc.status}; it can no longer be edited.</div>}
        <fieldset disabled={!editable} className="space-y-4">
          {doc.doc_type === "offer" ? <OfferForm f={fields} set={update} /> : <OrderForm f={fields} set={update} />}
          <Field label="Recipient email">
            <input className={inp} value={recipient} onChange={(e) => { setRecipient(e.target.value); setDirty(true); }} />
          </Field>
        </fieldset>
        {err && <div className="text-sm text-red-300">{err}</div>}
        {doc.email_error && doc.status === "failed" && <div className="text-sm text-red-300">Send failed: {doc.email_error}</div>}

        <div className="border-t border-white/10 pt-4 space-y-3">
          {doc.status === "draft" && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Approved by (your name)">
                <input className={inp} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="e.g. Giorgos" />
              </Field>
              <button disabled={!ready || approver.trim().length < 2} onClick={onApprove}
                className="px-4 py-2 rounded bg-amber-300 text-black text-sm font-semibold disabled:opacity-40">Approve this draft</button>
            </div>
          )}
          {canSend(doc.status) && (
            <button disabled={!ready} onClick={() => setConfirmOpen(true)}
              className="px-4 py-2 rounded bg-emerald-400 text-black text-sm font-semibold disabled:opacity-40">
              {doc.status === "failed" ? "Retry: Approve & Send to Customer" : "Approve & Send to Customer"}
            </button>
          )}
          {doc.status === "sent" && <div className="text-sm text-emerald-300">Sent to {doc.recipient} on {new Date(doc.sent_at).toLocaleString("el-GR")}.</div>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">PDF preview</div>
          {doc.pdf_url && <a href={doc.pdf_url} download={filename} target="_blank" rel="noreferrer" className="text-xs underline text-white/70">Download PDF</a>}
        </div>
        {doc.pdf_url ? <iframe title="PDF preview" src={doc.pdf_url} className="w-full h-[80vh] bg-white rounded" /> : <div className="text-sm text-white/40">No PDF yet.</div>}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4">
          <div className="w-full max-w-4xl bg-[#0c1016] border border-white/15 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Confirm sending</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-white/50">To: </span><b>{recipient}</b></div>
              <div><span className="text-white/50">Attachment: </span><b>{filename}</b></div>
              <div><span className="text-white/50">Approved by: </span>{doc.approved_by} · {doc.approved_at && new Date(doc.approved_at).toLocaleString("el-GR")}</div>
              <div><span className="text-white/50">PDF fingerprint: </span><span className="font-mono text-xs">{doc.pdf_sha256?.slice(0, 16)}</span></div>
            </div>
            <iframe title="Final PDF" src={doc.pdf_url} className="w-full h-[55vh] bg-white rounded" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} disabled={sending} className="px-4 py-2 rounded border border-white/20 text-sm">Cancel</button>
              <button onClick={onSend} disabled={sending || !/^\S+@\S+\.\S+$/.test(recipient)}
                className="px-4 py-2 rounded bg-emerald-400 text-black text-sm font-semibold disabled:opacity-40">
                {sending ? "Sending…" : "Send this PDF now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function T({ f, set, k, label, area }: { f: any; set: (p: any) => void; k: string; label: string; area?: boolean }) {
  return (
    <Field label={label}>
      {area ? <textarea rows={3} className={inp} value={f[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} />
        : <input className={inp} value={f[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} />}
    </Field>
  );
}
function N({ f, set, k, label }: { f: any; set: (p: any) => void; k: string; label: string }) {
  return (
    <Field label={label}>
      <input type="number" step="0.01" className={inp} value={f[k] ?? 0} onChange={(e) => set({ [k]: Number(e.target.value) })} />
    </Field>
  );
}

function OfferForm({ f, set }: { f: any; set: (p: any) => void }) {
  const t = offerTotals(f);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <T f={f} set={set} k="quote_date" label="Ημερομηνία" />
        <T f={f} set={set} k="quote_validity" label="Ισχύς προσφοράς" />
        <T f={f} set={set} k="client_name" label="Ονοματεπώνυμο / Επωνυμία" />
        <T f={f} set={set} k="client_phone" label="Τηλέφωνο" />
        <T f={f} set={set} k="client_email" label="Email πελάτη" />
        <T f={f} set={set} k="project_title" label="Τίτλος έργου" />
      </div>
      <T f={f} set={set} k="project_description" label="Περιγραφή" area />
      <div className="grid grid-cols-2 gap-3">
        <T f={f} set={set} k="service_type" label="Υπηρεσία" />
        <T f={f} set={set} k="material" label="Υλικό" />
        <T f={f} set={set} k="dimensions" label="Διαστάσεις" />
        <T f={f} set={set} k="thickness_tolerance" label="Πάχος / Ανοχή" />
        <T f={f} set={set} k="drawing_reference" label="Αναφορά σχεδίου" />
        <T f={f} set={set} k="technical_notes" label="Τεχνικές πληροφορίες" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <N f={f} set={set} k="quantity" label="Ποσότητα" />
        <N f={f} set={set} k="unit_price" label="Τιμή μονάδας €" />
        <N f={f} set={set} k="discount_percent" label="Έκπτωση %" />
        <N f={f} set={set} k="vat_percent" label="ΦΠΑ %" />
        <N f={f} set={set} k="deposit_percent" label="Προκαταβολή %" />
        <T f={f} set={set} k="delivery_time" label="Χρόνος παράδοσης" />
      </div>
      <div className="text-sm text-white/70">Καθαρή αξία {money(t.subtotal)} € · ΦΠΑ {money(t.vat_amount)} € · <b className="text-white">Τελικό {money(t.final_total)} €</b></div>
      <T f={f} set={set} k="payment_terms" label="Όροι πληρωμής" />
      <T f={f} set={set} k="client_notes" label="Σημειώσεις προς τον πελάτη" area />
      <div className="grid grid-cols-2 gap-3">
        <T f={f} set={set} k="approval_name" label="Έγκριση — όνομα (προαιρετικό)" />
        <T f={f} set={set} k="approval_date" label="Έγκριση — ημερομηνία" />
      </div>
    </div>
  );
}

function OrderForm({ f, set }: { f: any; set: (p: any) => void }) {
  const t = orderTotals(f);
  const lines: any[] = f.lines ?? [];
  const setLine = (i: number, p: any) => set({ lines: lines.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <T f={f} set={set} k="date" label="Ημερομηνία" />
        <T f={f} set={set} k="valid_until" label="Ισχύς έως" />
        <T f={f} set={set} k="to_name" label="Επωνυμία" />
        <T f={f} set={set} k="to_attention" label="Υπόψη" />
        <T f={f} set={set} k="to_address" label="Διεύθυνση" />
        <T f={f} set={set} k="to_area" label="Περιοχή" />
        <T f={f} set={set} k="to_tax_office" label="Δ.Ο.Υ." />
        <T f={f} set={set} k="to_vat_number" label="Α.Φ.Μ." />
        <T f={f} set={set} k="to_phone" label="Τηλέφωνο" />
        <T f={f} set={set} k="to_email" label="Email" />
      </div>
      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Γραμμές (έως {ORDER_FORM_MAX_LINES})</div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_60px_90px_28px] gap-2 items-center">
            <input className={inp} placeholder="Περιγραφή" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <input className={inp} type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
            <input className={inp} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
            <input className={inp} type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: Number(e.target.value) })} />
            <button type="button" onClick={() => set({ lines: lines.filter((_, j) => j !== i) })} className="text-white/50 hover:text-red-300">✕</button>
          </div>
        ))}
        {lines.length < ORDER_FORM_MAX_LINES && (
          <button type="button" onClick={() => set({ lines: [...lines, { description: "", quantity: 1, unit: "ΤΕΜ", unit_price: 0 }] })}
            className="text-xs underline text-white/70">+ Add line</button>
        )}
      </div>
      <N f={f} set={set} k="vat_percent" label="ΦΠΑ % (το έντυπο γράφει 24%)" />
      <div className="text-sm text-white/70">Καθαρή αξία {money(t.net)} € · ΦΠΑ {money(t.vat)} € · <b className="text-white">Σύνολο {money(t.total)} €</b></div>
      <div className="grid grid-cols-2 gap-3">
        <T f={f} set={set} k="delivery_time" label="Χρόνος παράδοσης" />
        <T f={f} set={set} k="warranty" label="Εγγύηση" />
        <T f={f} set={set} k="technical_details" label="Τεχνικές λεπτομέρειες (σύντομα)" />
        <T f={f} set={set} k="remarks" label="Παρατηρήσεις (σύντομα)" />
      </div>
      <div className="text-xs text-white/40">Payment terms, transport and bank details are printed on the original form.</div>
    </div>
  );
}
