import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  quoteDocGet,
  quoteDocUpdate,
  quoteDocSync,
  quoteDocGenerate,
  quoteDocPreview,
  quoteDocDownloadUrl,
  quoteDocEmailDefaults,
  quoteDocSend,
  quoteDocCreate,
} from "@/lib/api/quote-doc.functions";
import { computeTotals, emptyLine, money, type QuoteLine } from "@/lib/quote-calc";

export const Route = createFileRoute("/admin_/quote/$number")({
  ssr: false,
  head: () => ({
    meta: [{ title: "TOREO — Quotation" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: QuoteEditor,
});

const inputCls = "mt-1 w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm text-xs";
const btn = "px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase border border-white/20 hover:border-white/60 rounded-sm";

function QuoteEditor() {
  const { number } = Route.useParams();
  const get = useServerFn(quoteDocGet);
  const upd = useServerFn(quoteDocUpdate);
  const sync = useServerFn(quoteDocSync);
  const gen = useServerFn(quoteDocGenerate);
  const preview = useServerFn(quoteDocPreview);
  const dl = useServerFn(quoteDocDownloadUrl);
  const defaults = useServerFn(quoteDocEmailDefaults);
  const send = useServerFn(quoteDocSend);
  const create = useServerFn(quoteDocCreate);

  const [doc, setDoc] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [outdated, setOutdated] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [project, setProject] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [mail, setMail] = useState({ recipient: "", cc: "", subject: "", body: "" });

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  }

  async function reload() {
    const r: any = await get({ data: { number } });
    setDoc(r.doc);
    setOrder(r.order);
    setOutdated(!!r.outdated);
    setLines((r.doc.lines ?? []) as QuoteLine[]);
    setProject((r.doc.project ?? {}) as Record<string, string>);
    setTerms((r.doc.terms ?? {}) as Record<string, any>);
  }

  useEffect(() => {
    reload().catch((e) => flash(e.message ?? "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  const totals = useMemo(
    () => computeTotals(lines, { depositPct: Number(terms.deposit_pct) || 0, paid: Number(terms.paid) || 0 }),
    [lines, terms],
  );

  const locked = doc && !["draft", "generated"].includes(doc.status);

  async function save(silent = false) {
    setBusy("save");
    try {
      await upd({ data: { number, patch: { lines, project, terms } } });
      if (!silent) flash("Saved ✓");
      await reload();
    } catch (e: any) {
      flash(e.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function doPreview() {
    setBusy("preview");
    try {
      await upd({ data: { number, patch: { lines, project, terms } } });
      const r: any = await preview({ data: { number } });
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setPdfUrl(url);
      await reload();
    } catch (e: any) {
      flash(e.message ?? "Preview failed");
    } finally {
      setBusy(null);
    }
  }

  async function doGenerate() {
    setBusy("gen");
    try {
      await upd({ data: { number, patch: { lines, project, terms } } });
      await gen({ data: { number } });
      flash("PDF generated ✓");
      await reload();
      await doPreview();
    } catch (e: any) {
      flash(e.message ?? "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function doDownload() {
    try {
      const r: any = await dl({ data: { number } });
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      flash(e.message ?? "No PDF yet");
    }
  }

  async function openSend() {
    try {
      const d: any = await defaults({ data: { number } });
      setMail({ recipient: d.recipient ?? "", cc: "", subject: d.subject, body: d.body });
      setShowSend(true);
    } catch (e: any) {
      flash(e.message ?? "Failed");
    }
  }

  async function doSend() {
    setBusy("send");
    try {
      await send({ data: { number, recipient: mail.recipient, cc: mail.cc || null, subject: mail.subject, body: mail.body } });
      flash("Quotation sent ✓");
      setShowSend(false);
      await reload();
    } catch (e: any) {
      flash(e.message ?? "Send failed");
    } finally {
      setBusy(null);
    }
  }

  async function doCorrected() {
    if (!confirm("Create a new quotation number that replaces this one?")) return;
    setBusy("new");
    try {
      const n: any = await create({ data: { order_code: order.order_code, replaces: number } });
      window.location.href = `/admin/quote/${encodeURIComponent(n.number)}`;
    } catch (e: any) {
      flash(e.message ?? "Failed");
      setBusy(null);
    }
  }

  if (!doc) return <div className="min-h-screen bg-[#0a0d12] text-white p-10">Loading…</div>;

  const setT = (k: string, v: any) => setTerms((t) => ({ ...t, [k]: v }));
  const setP = (k: string, v: string) => setProject((p) => ({ ...p, [k]: v }));
  const updateLine = (i: number, patch: Partial<QuoteLine>) =>
    setLines((ls) => ls.map((l, x) => (x === i ? { ...l, ...patch, auto_managed: patch.auto_managed ?? (l.auto_managed && !("description" in patch || "qty" in patch || "unit_price" in patch)) } : l)));

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0d12]/95 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3">
        <Link to="/admin" className="text-[10px] font-mono tracking-widest text-white/60 hover:text-white">← ADMIN</Link>
        <div className="font-mono text-sm">{doc.number}</div>
        <span className="text-[10px] font-mono px-2 py-0.5 border border-white/10 rounded-sm uppercase tracking-widest">{doc.status}</span>
        {order && <span className="text-[10px] font-mono text-white/40">{order.order_code}</span>}
        {outdated && (
          <button onClick={async () => { setBusy("sync"); try { await sync({ data: { number } }); await reload(); flash("Synced ✓"); } catch (e: any) { flash(e.message); } finally { setBusy(null); } }}
            className="text-[10px] font-mono px-2 py-1 border border-amber-300/40 text-amber-200 rounded-sm">
            ⚠ Order changed — sync &amp; regenerate before sending
          </button>
        )}
        <div className="ml-auto flex gap-2 flex-wrap items-center">
          {toast && <span className="text-[10px] font-mono text-emerald-300">{toast}</span>}
          {!locked && <button className={btn} disabled={busy === "save"} onClick={() => save()}>💾 Save</button>}
          <button className={btn} disabled={busy === "preview"} onClick={doPreview}>👁 Preview PDF</button>
          {!locked && <button className={btn} disabled={busy === "gen"} onClick={doGenerate}>⚙ Generate PDF</button>}
          <button className={btn} onClick={doDownload}>⬇ Download</button>
          {!locked && doc.status === "generated" && (
            <button className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase bg-sky-500 text-black rounded-sm" onClick={openSend}>✉ Send to customer</button>
          )}
          {locked && <button className={btn + " border-amber-300/40 text-amber-200"} disabled={busy === "new"} onClick={doCorrected}>↻ New corrected quotation</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 p-4 lg:p-8">
        <div className="space-y-4">
          {locked && (
            <div className="border border-amber-300/30 text-amber-200 text-xs rounded-sm p-3">
              This quotation is {doc.status}. It can no longer be edited — create a new corrected quotation instead.
            </div>
          )}

          <section className="border border-white/10 rounded-sm p-4 bg-white/[0.02] space-y-2">
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Document</div>
            <label className="block text-xs">Language
              <select value={terms.lang ?? "el"} onChange={(e) => setT("lang", e.target.value)} disabled={locked} className={inputCls}>
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block text-xs">Validity
              <input value={terms.validity ?? ""} onChange={(e) => setT("validity", e.target.value)} disabled={locked} className={inputCls} />
            </label>
            <label className="block text-xs">Delivery time
              <input value={terms.delivery_time ?? ""} onChange={(e) => setT("delivery_time", e.target.value)} disabled={locked} className={inputCls} />
            </label>
            <label className="block text-xs">Payment terms
              <input value={terms.payment_terms ?? ""} onChange={(e) => setT("payment_terms", e.target.value)} disabled={locked} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">Deposit %
                <input type="number" step="1" value={terms.deposit_pct ?? 0} onChange={(e) => setT("deposit_pct", Number(e.target.value))} disabled={locked} className={inputCls} />
              </label>
              <label className="block text-xs">Amount paid
                <input type="number" step="0.01" value={terms.paid ?? 0} onChange={(e) => setT("paid", Number(e.target.value))} disabled={locked} className={inputCls} />
              </label>
            </div>
            <label className="block text-xs">Notes to customer
              <textarea rows={3} value={terms.notes ?? ""} onChange={(e) => setT("notes", e.target.value)} disabled={locked} className={inputCls} />
            </label>
          </section>

          <section className="border border-white/10 rounded-sm p-4 bg-white/[0.02] space-y-2">
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Project</div>
            {([
              ["title", "Title"],
              ["description", "Description"],
              ["service", "Service / process"],
              ["material", "Material"],
              ["dimensions", "Dimensions"],
              ["thickness", "Thickness"],
              ["tolerance", "Tolerance"],
              ["drawing_code", "Drawing code"],
              ["extra", "Additional technical info"],
            ] as [string, string][]).map(([k, label]) =>
              k === "description" || k === "extra" ? (
                <label key={k} className="block text-xs">{label}
                  <textarea rows={3} value={project[k] ?? ""} onChange={(e) => setP(k, e.target.value)} disabled={locked} className={inputCls} />
                </label>
              ) : (
                <label key={k} className="block text-xs">{label}
                  <input value={project[k] ?? ""} onChange={(e) => setP(k, e.target.value)} disabled={locked} className={inputCls} />
                </label>
              ),
            )}
          </section>

          <section className="border border-white/10 rounded-sm p-4 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Line items</div>
              {!locked && (
                <button className={btn} onClick={() => setLines((ls) => [...ls, emptyLine()])}>+ Add</button>
              )}
            </div>
            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={l.id ?? i} className="border border-white/10 rounded-sm p-2 space-y-1.5">
                  {l.auto_managed && <div className="text-[9px] font-mono uppercase tracking-widest text-sky-300">Synced with order</div>}
                  <textarea rows={2} value={l.description} disabled={locked} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" className={inputCls} />
                  <div className="grid grid-cols-5 gap-1">
                    <input type="number" step="0.01" value={l.qty} disabled={locked} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} className={inputCls} />
                    <input value={l.unit} disabled={locked} onChange={(e) => updateLine(i, { unit: e.target.value })} className={inputCls} />
                    <input type="number" step="0.01" value={l.unit_price} disabled={locked} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} className={inputCls} />
                    <input type="number" step="0.01" value={l.discount_pct} disabled={locked} onChange={(e) => updateLine(i, { discount_pct: Number(e.target.value) })} className={inputCls} />
                    <input type="number" step="0.01" value={l.vat_pct} disabled={locked} onChange={(e) => updateLine(i, { vat_pct: Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>qty · unit · price · disc% · vat%</span>
                    {!locked && <button className="text-red-400 hover:text-red-300" onClick={() => setLines((ls) => ls.filter((_, x) => x !== i))}>Remove</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 text-xs space-y-1 font-mono">
              <Row k="Net" v={money(totals.net)} />
              <Row k="VAT" v={money(totals.vat)} />
              <Row k="Total" v={money(totals.total)} strong />
              {Number(terms.deposit_pct) > 0 && <Row k={`Deposit ${terms.deposit_pct}%`} v={money(totals.deposit)} />}
              {Number(terms.paid) > 0 && <Row k="Balance" v={money(totals.balance)} />}
            </div>
          </section>
        </div>

        <div className="min-h-[70vh] border border-white/10 rounded-sm bg-white/[0.02] flex flex-col">
          {pdfUrl ? (
            <iframe title="Quotation PDF" src={pdfUrl} className="w-full flex-1 min-h-[80vh] rounded-sm" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40 text-xs">
              Press “Preview PDF” to render the quotation.
            </div>
          )}
        </div>
      </div>

      {showSend && (
        <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a0d12] border border-white/10 rounded-sm max-w-xl w-full p-5 space-y-3">
            <div className="text-sm font-semibold">Send quotation {doc.number}</div>
            <label className="block text-xs">To
              <input value={mail.recipient} onChange={(e) => setMail({ ...mail, recipient: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-xs">CC (optional)
              <input value={mail.cc} onChange={(e) => setMail({ ...mail, cc: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-xs">Subject
              <input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-xs">Message
              <textarea rows={10} value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} className={inputCls} />
            </label>
            <div className="text-[10px] text-white/40">The generated PDF {doc.number}.pdf is attached automatically.</div>
            <div className="flex justify-end gap-2">
              <button className={btn} onClick={() => setShowSend(false)}>Cancel</button>
              <button disabled={busy === "send"} onClick={doSend} className="px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase bg-sky-500 text-black rounded-sm">
                {busy === "send" ? "Sending…" : "Confirm & send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-white font-semibold" : "text-white/60"}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
