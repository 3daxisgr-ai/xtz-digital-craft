import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  customerPostMessage,
  getMyOrder,
  getOrderFileUrl,
} from "@/lib/api/orders.functions";
import { getOrderAnalyses } from "@/lib/api/factory.functions";
import { portalAiAssistant, portalDelayPrediction } from "@/lib/api/portal.functions";
import {
  listProductionPhotos,
  customerRespondPhotos,
  submitReview,
  getMyReview,
} from "@/lib/api/features.functions";
import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";
import { StatusBadge, StatusProgress } from "@/components/portal/StatusProgress";
const ModelViewer = lazy(() => import("@/components/factory/ModelViewer"));
import { RequestSummary } from "@/components/xtz/RequestSummary";


export const Route = createFileRoute("/portal/$orderCode")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Order — TOREO" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PortalOrderPage,
});

function PortalOrderPage() {
  const { orderCode } = useParams({ from: "/portal/$orderCode" });
  const navigate = useNavigate();
  const get = useServerFn(getMyOrder);
  const post = useServerFn(customerPostMessage);
  const sign = useServerFn(getOrderFileUrl);
  const listAnalyses = useServerFn(getOrderAnalyses);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  async function reload() {
    try {
      const d = await get({ data: { order_code: orderCode } });
      setData(d);
      // load latest AI analysis (best-effort; requires the customer email for auth)
      const email = (d as any)?.order?.customer_email;
      if (email) {
        listAnalyses({ data: { order_code: orderCode, email } })
          .then((rows: any) => setAnalysis(Array.isArray(rows) && rows.length ? rows[0] : null))
          .catch(() => {});
      }
      // Preview first STL/OBJ file
      const previewable = (d?.files ?? []).find((f: any) =>
        /\.(stl|obj)$/i.test(f.file_name || ""),
      );
      if (previewable) {
        try {
          const { url } = await sign({ data: { file_path: previewable.file_path } });
          if (url) {
            setPreviewUrl(url);
            setPreviewName(previewable.file_name);
          }
        } catch {}
      }
    } catch (e: any) {

      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        navigate({ to: "/auth" });
        return;
      }
      reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode]);

  async function send() {
    if (!msg.trim()) return;
    await post({ data: { order_code: orderCode, body: msg.trim() } });
    setMsg("");
    reload();
  }

  async function download(path: string) {
    const { url } = await sign({ data: { file_path: path } });
    if (url) window.open(url, "_blank");
  }

  if (loading)
    return <div className="min-h-screen bg-[#070708] text-white/40 text-sm flex items-center justify-center">Loading…</div>;
  if (error)
    return (
      <div className="min-h-screen bg-[#070708] text-white px-4 py-16 text-center">
        <p className="text-red-400">{error}</p>
        <Link to="/portal" className="mt-4 inline-block underline">
          ← Back to portal
        </Link>
      </div>
    );

  const { order, events, files, messages } = data;

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 sticky top-0 bg-[#070708]/90 backdrop-blur z-10">
        <Link to="/portal" className="font-mono text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase">
          ← All orders
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold font-mono tracking-wider">{order.order_code}</h1>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-sm text-white/50 mt-1">
            {order.service ?? "—"} · {order.material ?? "—"} ·{" "}
            {new Date(order.created_at).toLocaleString()}
          </div>
        </div>

        <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">Progress</div>
          <div className="mt-4">
            <StatusProgress status={order.status} />
          </div>
        </section>

        <RequestSummary metadata={(order as any).metadata} />


        <div className="grid md:grid-cols-2 gap-6">
          <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Quote</div>
            <div className="text-3xl font-semibold">
              {order.quote_price != null ? `€${Number(order.quote_price).toFixed(2)}` : "Pending"}
            </div>
            {order.quantity && (
              <div className="text-sm text-white/60 mt-1">Quantity: {order.quantity}</div>
            )}
            {order.dimensions && (
              <div className="text-sm text-white/60">Dimensions: {order.dimensions}</div>
            )}
          </section>
          <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Shipping</div>
            <div className="text-sm space-y-1.5">
              <div>Courier: <span className="text-white/80">{order.courier ?? "—"}</span></div>
              <div>
                Tracking:{" "}
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                    {order.tracking_number ?? "Open"}
                  </a>
                ) : (
                  <span className="text-white/80">{order.tracking_number ?? "—"}</span>
                )}
              </div>
              <div>ETA: <span className="text-white/80">{order.estimated_delivery ?? "—"}</span></div>
            </div>
          </section>
        </div>

        {(previewUrl || analysis) && (
          <section className="grid md:grid-cols-2 gap-6">
            {previewUrl && (
              <Suspense fallback={<div className="h-[360px] rounded-lg bg-white/[0.02] border border-white/10" />}>
                <ModelViewer url={previewUrl} fileName={previewName} height={360} />
              </Suspense>
            )}
            <div className={previewUrl ? "" : "md:col-span-2"}>
              <AIAnalysisCard a={analysis} customerView />
            </div>
          </section>
        )}

        <ProductionPhotos orderCode={orderCode} status={order.status} onChange={reload} />

        <QrAndReport orderCode={orderCode} />

        {order.status === "delivered" && <ReviewSection orderCode={orderCode} />}

        <DelayAndAssistant orderCode={orderCode} />






        <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Timeline</div>
          <ol className="space-y-4 relative pl-5 border-l border-white/10">
            {events.map((ev: any) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                <div className="text-sm font-medium">{ev.title}</div>
                {ev.description && <div className="text-xs text-white/50 mt-0.5">{ev.description}</div>}
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mt-1">
                  {new Date(ev.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {files.length > 0 && (
          <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Files</div>
            <ul className="divide-y divide-white/5">
              {files.map((f: any) => (
                <li key={f.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">{f.file_name}</span>
                  <button
                    onClick={() => download(f.file_path)}
                    className="text-xs text-sky-300 hover:underline"
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Messages</div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-xs text-white/40">No messages yet.</div>
            )}
            {messages.map((m: any) => (
              <div
                key={m.id}
                className={`flex ${m.from_role === "admin" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.from_role === "admin"
                      ? "bg-white/10 text-white"
                      : "bg-sky-500/20 text-sky-50 border border-sky-400/30"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">
                    {m.from_role === "admin" ? "TOREO" : "You"} ·{" "}
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Send a message to TOREO…"
              className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
            />
            <button
              onClick={send}
              className="bg-white text-black rounded-md px-4 text-sm font-semibold"
            >
              Send
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function DelayAndAssistant({ orderCode }: { orderCode: string }) {
  const predict = useServerFn(portalDelayPrediction);
  const ask = useServerFn(portalAiAssistant);
  const [pred, setPred] = useState<any>(null);
  const [q, setQ] = useState("");
  const [conv, setConv] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    predict({ data: { order_code: orderCode } }).then(setPred).catch(() => {});
  }, [orderCode]); // eslint-disable-line

  async function send() {
    const question = q.trim();
    if (!question || busy) return;
    setConv((c) => [...c, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const r: any = await ask({ data: { order_code: orderCode, question } });
      setConv((c) => [...c, { role: "assistant", text: r.answer }]);
    } catch (e: any) {
      setConv((c) => [...c, { role: "assistant", text: `Error: ${e.message ?? "assistant unavailable"}` }]);
    } finally { setBusy(false); }
  }

  const riskColor = pred?.risk === "on_track" ? "text-emerald-300" : pred?.risk === "at_risk" ? "text-amber-300" : "text-red-400";

  return (
    <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Delivery outlook & order assistant</div>
      {pred ? (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-[10px] font-mono uppercase text-white/40">Status</div>
            <div className={`text-lg font-semibold uppercase font-mono ${riskColor}`}>{pred.risk.replace("_", " ")}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-white/40">Predicted delivery</div>
            <div className="text-lg font-semibold">{new Date(pred.predicted_delivery).toLocaleDateString()}</div>
            <div className="text-xs text-white/50">Target: {new Date(pred.due_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-white/40">Reasons</div>
            <ul className="text-xs text-white/70 space-y-0.5 mt-1">
              {pred.reasons.length === 0 ? <li className="text-emerald-300/70">On track ✓</li> : pred.reasons.map((r: string, i: number) => <li key={i}>· {r}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/40 mb-4">Calculating prediction…</div>
      )}
      <div className="border-t border-white/10 pt-4">
        <div className="text-xs text-white/50 mb-2">Ask about your order — the assistant knows your current status, quote, and production plan.</div>
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {conv.map((m, i) => (
            <div key={i} className={`text-sm rounded-md px-3 py-2 ${m.role === "user" ? "bg-sky-500/15 border border-sky-400/30 ml-8" : "bg-white/[0.04] border border-white/10 mr-8"}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">{m.role === "user" ? "You" : "TOREO"}</div>
              {m.text}
            </div>
          ))}
          {busy && <div className="text-xs text-white/40 italic">Thinking…</div>}
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="When will my order be ready?"
            className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-white/30 focus:border-white/40 outline-none" />
          <button onClick={send} disabled={busy || !q.trim()} className="bg-white text-black rounded-md px-4 text-sm font-semibold disabled:opacity-40">Ask</button>
        </div>
      </div>
    </section>
  );
}

function ProductionPhotos({ orderCode, status, onChange }: { orderCode: string; status: string; onChange: () => void }) {
  const load = useServerFn(listProductionPhotos);
  const respond = useServerFn(customerRespondPhotos);
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { setData(await load({ data: { order_code: orderCode } })); } catch {}
  }
  useEffect(() => { reload(); }, [orderCode]); // eslint-disable-line

  if (!data || data.photos.length === 0) return null;
  const approval = data.approval;
  const canRespond = !approval || approval === "pending" || approval === "changes_requested";
  const showApprove = canRespond && ["production", "quality_inspection"].includes(status);

  async function act(action: "approve" | "request_changes") {
    setBusy(true);
    try {
      await respond({ data: { order_code: orderCode, action, comment: comment || undefined } });
      setComment("");
      await reload();
      onChange();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">Production Photos</div>
        {approval === "approved" && <span className="text-xs text-emerald-300">✓ Approved</span>}
        {approval === "changes_requested" && <span className="text-xs text-amber-300">Changes requested</span>}
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.photos.map((p: any) => (
          <div key={p.id} className="border border-white/10 rounded-md overflow-hidden">
            {p.url && <img src={p.url} alt={p.file_name} className="w-full h-40 object-cover" />}
            <div className="p-2 text-[10px] text-white/50">
              <div className="font-mono">{new Date(p.created_at).toLocaleDateString()}</div>
              {p.caption && <div className="text-white/70 mt-0.5">{p.caption}</div>}
            </div>
          </div>
        ))}
      </div>
      {showApprove && (
        <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment…"
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => act("approve")} className="bg-emerald-500 text-black rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">Approve Production →</button>
            <button disabled={busy} onClick={() => act("request_changes")} className="border border-amber-400/50 text-amber-200 rounded-md px-4 py-2 text-sm disabled:opacity-50">Request Changes</button>
          </div>
        </div>
      )}
    </section>
  );
}

function QrAndReport({ orderCode }: { orderCode: string }) {
  const trackUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.toreo.gr"}/track?code=${encodeURIComponent(orderCode)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(trackUrl)}`;
  return (
    <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 md:p-6 flex items-center gap-4 flex-wrap">
      <img src={qr} alt="QR" className="rounded-md bg-white p-1" width={100} height={100} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">Share / Track</div>
        <div className="text-sm mt-1 truncate">{trackUrl}</div>
        <div className="mt-2 flex gap-2">
          <a href={`/admin/report/${orderCode}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 border border-white/20 hover:border-white/40 rounded-sm">Manufacturing Report</a>
          <a href={qr} download={`${orderCode}-qr.png`} className="text-xs px-3 py-1.5 border border-white/20 hover:border-white/40 rounded-sm">Download QR</a>
        </div>
      </div>
    </section>
  );
}

function ReviewSection({ orderCode }: { orderCode: string }) {
  const load = useServerFn(getMyReview);
  const send = useServerFn(submitReview);
  const [existing, setExisting] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { load({ data: { order_code: orderCode } }).then(setExisting).catch(() => {}); }, [orderCode]); // eslint-disable-line

  if (existing || done) {
    return (
      <section className="border border-emerald-400/30 bg-emerald-400/5 rounded-lg p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-emerald-300/80">Thank you</div>
        <div className="text-sm mt-1">Your review has been submitted{existing && !existing.approved ? " and is awaiting approval." : "."}</div>
      </section>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      let photo_base64: string | undefined;
      if (photo) {
        const b = await photo.arrayBuffer();
        photo_base64 = btoa(String.fromCharCode(...new Uint8Array(b)));
      }
      await send({ data: { order_code: orderCode, rating, comment: comment || undefined, photo_base64, photo_name: photo?.name } });
      setDone(true);
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="border border-amber-400/30 bg-amber-400/5 rounded-lg p-5 md:p-6">
      <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber-300/80">Leave a Review</div>
      <div className="text-sm mt-1 text-white/70">How was your experience with TOREO?</div>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-300" : "text-white/20"}`}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Tell us about your project…"
        className="mt-3 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm" />
      <div className="mt-2">
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
      </div>
      <button disabled={busy} onClick={submit} className="mt-3 bg-white text-black rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50">
        {busy ? "Sending…" : "Submit Review"}
      </button>
    </section>
  );
}

