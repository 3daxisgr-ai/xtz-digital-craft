import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { trackOrder } from "@/lib/api/orders.functions";
import { StatusBadge, StatusProgress } from "@/components/portal/StatusProgress";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/track")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Track an Order — TOREO" },
      {
        name: "description",
        content: "Enter your TOREO order ID and email to track manufacturing status, shipping and estimated delivery.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { code } = useSearch({ from: "/track" });
  const track = useServerFn(trackOrder);
  const [orderCode, setOrderCode] = useState(code ?? "");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code) setOrderCode(code);
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await track({ data: { order_code: orderCode.trim(), email: email.trim() } });
      if (!r.found) setError("No order found for that ID and email.");
      else setResult(r);
    } catch (e: any) {
      setError(e.message ?? "Could not look up order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4">
        <Link to="/" className="font-mono text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase">
          ← TOREO
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Order Tracking</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Track your order</h1>
        <p className="text-white/50 mt-2 text-sm">
          Enter your Order ID and the email you submitted with to see status, shipping, and timeline.
        </p>

        <form onSubmit={submit} className="mt-8 grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            required
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="TR-2026-0001"
            className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none font-mono uppercase"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black hover:bg-white/90 rounded-md px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "…" : "Track"}
          </button>
        </form>

        {error && (
          <div className="mt-4 text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {result?.order && (
          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="font-mono text-lg tracking-wider">{result.order.order_code}</div>
              <StatusBadge status={result.order.status} />
            </div>

            <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
              <StatusProgress status={result.order.status} />
            </section>

            <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5 text-sm space-y-1.5">
              <div>Courier: <span className="text-white/80">{result.order.courier ?? "—"}</span></div>
              <div>
                Tracking:{" "}
                {result.order.tracking_url ? (
                  <a href={result.order.tracking_url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                    {result.order.tracking_number ?? "Open"}
                  </a>
                ) : (
                  <span className="text-white/80">{result.order.tracking_number ?? "—"}</span>
                )}
              </div>
              <div>Estimated delivery: <span className="text-white/80">{result.order.estimated_delivery ?? "—"}</span></div>
            </section>

            <section className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Timeline</div>
              <ol className="space-y-3 relative pl-5 border-l border-white/10">
                {result.events.map((ev: any, i: number) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                    <div className="text-sm">{ev.title}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mt-0.5">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Link to="/auth" className="text-sm text-sky-300 hover:underline">
              Sign in for full order history and files →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
