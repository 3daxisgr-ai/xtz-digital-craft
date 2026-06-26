import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  customerPostMessage,
  getMyOrder,
  getOrderFileUrl,
} from "@/lib/api/orders.functions";
import { StatusBadge, StatusProgress } from "@/components/portal/StatusProgress";

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function reload() {
    try {
      const d = await get({ data: { order_code: orderCode } });
      setData(d);
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
