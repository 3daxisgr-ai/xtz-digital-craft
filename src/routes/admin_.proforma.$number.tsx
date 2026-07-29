import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProforma, updateProforma, setProformaLines, reviseProforma, sendProformaEmail, syncProformaFromOrder } from "@/lib/api/proforma.functions";

export const Route = createFileRoute("/admin_/proforma/$number")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Proforma Invoice" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ProformaEditor,
});

type Line = { id?: string; position: number; description: string; qty: number; unit: string; unit_price: number; discount_pct: number; vat_pct: number };

function ProformaEditor() {
  const { number } = Route.useParams();
  const get = useServerFn(getProforma);
  const upd = useServerFn(updateProforma);
  const saveLines = useServerFn(setProformaLines);
  const revise = useServerFn(reviseProforma);
  const send = useServerFn(sendProformaEmail);
  const sync = useServerFn(syncProformaFromOrder);

  const [pf, setPf] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [drift, setDrift] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [deposit, setDeposit] = useState("0");
  const [showSend, setShowSend] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  async function reload() {
    const r: any = await get({ data: { number } });
    setPf(r.proforma); setOrder(r.order); setDrift(!!r.drift);
    setLines((r.lines || []).map((l: any) => ({
      id: l.id, position: l.position, description: l.description, qty: Number(l.qty), unit: l.unit,
      unit_price: Number(l.unit_price), discount_pct: Number(l.discount_pct), vat_pct: Number(l.vat_pct),
    })));
    setNotes(r.proforma.notes ?? "");
    setDue(r.proforma.due_date ?? "");
    setDeposit(String(r.proforma.deposit_amount ?? 0));
    setEmailTo(r.order?.customer_email ?? "");
    setEmailSubject(`Proforma Invoice ${r.proforma.number} — TOREO`);
  }
  useEffect(() => { reload().catch(console.error); }, [number]); // eslint-disable-line

  const totals = useMemo(() => {
    let sub = 0, disc = 0, vat = 0;
    for (const l of lines) {
      const lineSub = l.qty * l.unit_price;
      const lineDisc = lineSub * (l.discount_pct / 100);
      const lineNet = lineSub - lineDisc;
      const lineVat = lineNet * (l.vat_pct / 100);
      sub += lineSub; disc += lineDisc; vat += lineVat;
    }
    const total = sub - disc + vat;
    return { sub, disc, vat, total };
  }, [lines]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function saveAll() {
    setBusy("save");
    try {
      await saveLines({ data: { number, lines } });
      await upd({ data: { number, patch: {
        notes, due_date: due || null, deposit_amount: Number(deposit) || 0,
        financial_snapshot: { currency: pf.financial_snapshot?.currency ?? "EUR", ...totals },
      } } });
      flash("Saved ✓"); await reload();
    } catch (e: any) { flash(e.message ?? "Failed"); } finally { setBusy(null); }
  }

  async function doRevise() {
    if (!confirm("Cancel this proforma and start a new revision?")) return;
    setBusy("revise");
    try {
      const n: any = await revise({ data: { number } });
      window.location.href = `/admin/proforma/${encodeURIComponent(n.number)}`;
    } catch (e: any) { flash(e.message ?? "Failed"); setBusy(null); }
  }

  async function doSend() {
    setBusy("send");
    try {
      await saveAll();
      const url = `${window.location.origin}/admin/proforma/${encodeURIComponent(number)}`;
      const r: any = await send({ data: { number, recipient: emailTo, subject: emailSubject, body: emailBody || null, view_url: url } });
      if (r.ok) { flash("Sent ✓"); setShowSend(false); await reload(); }
      else flash("Email failed: " + (r.error ?? ""));
    } catch (e: any) { flash(e.message ?? "Failed"); } finally { setBusy(null); }
  }

  async function doSync() {
    setBusy("sync");
    try { await sync({ data: { number } }); await reload(); flash("Synced ✓"); }
    catch (e: any) { flash(e.message ?? "Failed"); } finally { setBusy(null); }
  }

  function addLine() {
    setLines((ls) => [...ls, { position: ls.length, description: "", qty: 1, unit: "pcs", unit_price: 0, discount_pct: 0, vat_pct: 24 }]);
  }
  function removeLine(i: number) { setLines((ls) => ls.filter((_, x) => x !== i)); }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, x) => x === i ? { ...l, ...patch } : l));
  }

  if (!pf) return <div className="min-h-screen bg-[#0a0d12] text-white p-10">Loading…</div>;

  const cs = pf.customer_snapshot ?? {};
  const currency = pf.financial_snapshot?.currency ?? "EUR";
  const money = (n: number) => `${currency === "EUR" ? "€" : currency + " "}${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0d12]/95 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3 print:hidden">
        <Link to="/admin" className="text-[10px] font-mono tracking-widest text-white/60 hover:text-white">← ADMIN</Link>
        <div className="font-mono text-sm">{pf.number}</div>
        <span className="text-[10px] font-mono px-2 py-0.5 border border-white/10 rounded-sm uppercase tracking-widest">{pf.status}</span>
        {pf.revision > 0 && <span className="text-[10px] font-mono text-amber-300">REV {pf.revision}</span>}
        {drift && (
          <button onClick={doSync} className="text-[10px] font-mono px-2 py-1 border border-amber-300/40 text-amber-200 rounded-sm">
            ⚠ Order changed — sync customer info
          </button>
        )}
        <div className="ml-auto flex gap-2 flex-wrap">
          {toast && <span className="text-[10px] font-mono text-emerald-300 self-center">{toast}</span>}
          <button onClick={saveAll} disabled={busy === "save"} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-white/20 hover:border-white/60 rounded-sm">{busy === "save" ? "Saving…" : "💾 Save"}</button>
          <button onClick={() => window.print()} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-white/20 hover:border-white/60 rounded-sm">🖨 Print / PDF</button>
          <button onClick={() => setShowSend(true)} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase bg-sky-500 text-black rounded-sm">✉ Send Email</button>
          <button onClick={doRevise} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-amber-300/40 text-amber-200 rounded-sm">↻ New Revision</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 p-4 lg:p-8">
        {/* Editor */}
        <div className="space-y-4 print:hidden">
          <section className="border border-white/10 rounded-sm p-4 bg-white/[0.02]">
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40 mb-2">Meta</div>
            <label className="block text-xs mb-2">Due date
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
            <label className="block text-xs mb-2">Deposit ({currency})
              <input value={deposit} onChange={(e) => setDeposit(e.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
            <label className="block text-xs">Notes / terms
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
          </section>

          <section className="border border-white/10 rounded-sm p-4 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Line Items</div>
              <button onClick={addLine} className="text-[10px] font-mono tracking-widest uppercase border border-white/20 hover:border-white/60 px-2 py-1 rounded-sm">+ Add</button>
            </div>
            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="border border-white/10 rounded-sm p-2 space-y-1.5">
                  <textarea value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })}
                    placeholder="Description" rows={2}
                    className="w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm text-xs" />
                  <div className="grid grid-cols-5 gap-1">
                    <input type="number" step="0.01" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} placeholder="Qty" className="bg-black/40 border border-white/10 px-1.5 py-1 rounded-sm text-xs" />
                    <input value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} placeholder="Unit" className="bg-black/40 border border-white/10 px-1.5 py-1 rounded-sm text-xs" />
                    <input type="number" step="0.01" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} placeholder="Price" className="bg-black/40 border border-white/10 px-1.5 py-1 rounded-sm text-xs" />
                    <input type="number" step="0.01" value={l.discount_pct} onChange={(e) => updateLine(i, { discount_pct: Number(e.target.value) })} placeholder="Disc %" className="bg-black/40 border border-white/10 px-1.5 py-1 rounded-sm text-xs" />
                    <input type="number" step="0.01" value={l.vat_pct} onChange={(e) => updateLine(i, { vat_pct: Number(e.target.value) })} placeholder="VAT %" className="bg-black/40 border border-white/10 px-1.5 py-1 rounded-sm text-xs" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 font-mono">{money(l.qty * l.unit_price * (1 - l.discount_pct / 100) * (1 + l.vat_pct / 100))}</span>
                    <button onClick={() => removeLine(i)} className="text-[10px] font-mono text-red-400 hover:text-red-300">Remove</button>
                  </div>
                </div>
              ))}
              {lines.length === 0 && <div className="text-xs text-white/40">No lines. Add one.</div>}
            </div>
          </section>
        </div>

        {/* A4 preview */}
        <div className="flex justify-center">
          <div id="a4-preview" className="bg-white text-black shadow-2xl mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "18mm" }}>
            <header className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
              <div>
                <div className="text-3xl font-bold tracking-tight">TOREO</div>
                <div className="text-[11px] text-neutral-600 mt-1">Manufacturing · Thessaloniki, Greece</div>
                <div className="text-[11px] text-neutral-600">INFO@TOREO.GR · +30 6970609960</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-neutral-500">Proforma Invoice</div>
                <div className="font-mono text-xl mt-1">{pf.number}</div>
                <div className="text-[11px] text-neutral-600 mt-1">Date: {new Date(pf.created_at).toLocaleDateString()}</div>
                {due && <div className="text-[11px] text-neutral-600">Due: {new Date(due).toLocaleDateString()}</div>}
                {pf.revision > 0 && <div className="text-[11px] font-semibold text-amber-700">Revision {pf.revision}</div>}
              </div>
            </header>

            <section className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Bill To</div>
                <div className="font-semibold">{cs.name}</div>
                {cs.company && <div>{cs.company}</div>}
                <div className="text-neutral-700 text-sm">{cs.email}</div>
                {cs.phone && <div className="text-neutral-700 text-sm">{cs.phone}</div>}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Reference</div>
                {order && <div className="font-mono text-sm">{order.order_code}</div>}
                {order?.service && <div className="text-sm capitalize">{String(order.service).replace(/_/g, " ")}</div>}
              </div>
            </section>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-black text-left text-[11px] uppercase tracking-wider">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right w-16">Qty</th>
                  <th className="py-2 text-right w-16">Unit</th>
                  <th className="py-2 text-right w-24">Price</th>
                  <th className="py-2 text-right w-20">Disc</th>
                  <th className="py-2 text-right w-16">VAT</th>
                  <th className="py-2 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const net = l.qty * l.unit_price * (1 - l.discount_pct / 100);
                  return (
                    <tr key={i} className="border-b border-neutral-200 align-top">
                      <td className="py-2 whitespace-pre-wrap">{l.description}</td>
                      <td className="py-2 text-right">{l.qty}</td>
                      <td className="py-2 text-right">{l.unit}</td>
                      <td className="py-2 text-right">{money(l.unit_price)}</td>
                      <td className="py-2 text-right">{l.discount_pct}%</td>
                      <td className="py-2 text-right">{l.vat_pct}%</td>
                      <td className="py-2 text-right font-medium">{money(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <section className="flex justify-end mb-6">
              <table className="text-sm">
                <tbody>
                  <tr><td className="pr-8 text-neutral-600">Subtotal</td><td className="text-right font-mono">{money(totals.sub)}</td></tr>
                  <tr><td className="pr-8 text-neutral-600">Discount</td><td className="text-right font-mono">−{money(totals.disc)}</td></tr>
                  <tr><td className="pr-8 text-neutral-600">VAT</td><td className="text-right font-mono">{money(totals.vat)}</td></tr>
                  <tr className="border-t-2 border-black">
                    <td className="pr-8 pt-2 font-semibold uppercase text-xs tracking-widest">Total</td>
                    <td className="text-right pt-2 font-mono text-lg font-bold">{money(totals.total)}</td>
                  </tr>
                  {Number(deposit) > 0 && (
                    <tr><td className="pr-8 text-neutral-600">Deposit due</td><td className="text-right font-mono">{money(Number(deposit))}</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            {notes && (
              <section className="text-[11px] text-neutral-700 whitespace-pre-wrap border-t border-neutral-200 pt-4">
                {notes}
              </section>
            )}

            <footer className="mt-10 pt-4 border-t border-neutral-300 text-[10px] text-neutral-500 text-center">
              This proforma invoice is not a fiscal document. Payment confirmation issues a final invoice.<br />
              TOREO Manufacturing · toreo.gr · INFO@TOREO.GR
            </footer>
          </div>
        </div>
      </div>

      {showSend && (
        <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#0a0d12] border border-white/10 rounded-sm max-w-lg w-full p-5 space-y-3">
            <div className="text-sm font-semibold">Send proforma by email</div>
            <label className="block text-xs">To
              <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
            <label className="block text-xs">Subject
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
            <label className="block text-xs">Body (optional)
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} className="mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSend(false)} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-white/20 rounded-sm">Cancel</button>
              <button onClick={doSend} disabled={busy === "send"} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase bg-sky-500 text-black rounded-sm">
                {busy === "send" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } #a4-preview { box-shadow: none !important; margin: 0 !important; } }`}</style>
    </div>
  );
}
