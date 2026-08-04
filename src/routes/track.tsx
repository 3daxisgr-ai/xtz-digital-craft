import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { trackOrder, STATUS_LABEL } from "@/lib/api/orders.functions";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/track")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Track Your Order — TOREO Manufacturing" },
      {
        name: "description",
        content:
          "Enter your TOREO order number and email to follow your order from confirmation through manufacturing, packaging, shipping and delivery.",
      },
      { property: "og:title", content: "Track Your Order — TOREO Manufacturing" },
      {
        property: "og:description",
        content: "Follow your TOREO order from confirmation to delivery with live status updates and documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

/* ---------- customer-facing stage model ---------- */

type StageKey = "confirmed" | "manufacturing" | "packaging" | "shipping" | "delivered";

const STAGES: { key: StageKey; label: string; message: string }[] = [
  { key: "confirmed", label: "Order Confirmed", message: "The order has been received and is being prepared." },
  { key: "manufacturing", label: "Manufacturing", message: "Your parts are currently being manufactured." },
  { key: "packaging", label: "Packaging", message: "Your order is being prepared for shipment." },
  { key: "shipping", label: "Shipping", message: "Your order has been shipped." },
  { key: "delivered", label: "Delivered", message: "Your order has been delivered." },
];

const STATUS_TO_STAGE: Record<string, StageKey> = {
  quote_received: "confirmed",
  engineering_review: "confirmed",
  quote_sent: "confirmed",
  awaiting_approval: "confirmed",
  payment_received: "confirmed",
  production: "manufacturing",
  quality_inspection: "manufacturing",
  packaging: "packaging",
  ready_for_shipping: "packaging",
  shipped: "shipping",
  delivered: "delivered",
  completed: "delivered",
};

function stageIndex(status: string) {
  const key = STATUS_TO_STAGE[status];
  const i = STAGES.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------- page ---------- */

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
    setResult(null);
    setLoading(true);
    try {
      const r = await track({ data: { order_code: orderCode.trim(), email: email.trim() } });
      if (!r.found) setError("We couldn't find an order with that number and email address.");
      else setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Could not look up this order. Please try again.");
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

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {!result && (
          <>
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Order Tracking</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Track your order</h1>
            <p className="text-white/50 mt-2 text-sm max-w-lg">
              Enter your order number and the email address used on the order.
            </p>
          </>
        )}

        <form onSubmit={submit} className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            required
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="TR-2026-0001"
            aria-label="Order number"
            className="min-w-0 bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none font-mono uppercase"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            aria-label="Email address"
            className="min-w-0 bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 bg-white text-black hover:bg-white/90 rounded-md px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Checking…" : "Track"}
          </button>
        </form>

        {error && (
          <div className="mt-4 text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2.5">
            {error}
          </div>
        )}

        {result?.order && (
          <OrderView
            data={result}
            orderCode={orderCode.trim()}
            email={email.trim()}
            onRefresh={async () => {
              try {
                const r = await track({ data: { order_code: orderCode.trim(), email: email.trim() } });
                if (r.found) setResult(r);
              } catch {
                /* keep current view */
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ---------- order view ---------- */

function OrderView({ data }: { data: any }) {
  const order = data.order;
  const idx = stageIndex(order.status);
  const current = STAGES[idx];
  const pct = (idx / (STAGES.length - 1)) * 100;

  return (
    <div className="mt-10 space-y-6">
      {/* 1. Header */}
      <section className="border border-white/10 bg-white/[0.02] rounded-xl p-5 md:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">Order</div>
            <div className="font-mono text-xl md:text-2xl tracking-wider truncate mt-1">{order.order_code}</div>
          </div>
          <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            {current.label}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <Field label="Order date" value={fmtDate(order.created_at)} />
          <Field label="Status" value={STATUS_LABEL[order.status] ?? current.label} />
          <Field label="Estimated delivery" value={fmtDate(order.estimated_delivery)} />
        </div>
      </section>

      {/* 2. Progress */}
      <section className="border border-white/10 bg-white/[0.02] rounded-xl p-5 md:p-6">
        <div className="relative">
          <div className="absolute left-3 top-3 bottom-3 w-px bg-white/10 sm:hidden" />
          <div className="hidden sm:block absolute left-0 right-0 top-[11px] h-px bg-white/10" />
          <div
            className="hidden sm:block absolute left-0 top-[11px] h-px bg-gradient-to-r from-sky-400 to-emerald-300 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          <ol className="relative flex flex-col gap-5 sm:flex-row sm:gap-0 sm:justify-between">
            {STAGES.map((s, i) => {
              const done = i <= idx;
              return (
                <li key={s.key} className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:flex-1">
                  <span
                    className={`shrink-0 grid place-items-center w-[22px] h-[22px] rounded-full border text-[10px] ${
                      done
                        ? "bg-emerald-400 border-emerald-400 text-black"
                        : "bg-[#070708] border-white/20 text-white/30"
                    } ${i === idx ? "ring-4 ring-emerald-400/20" : ""}`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-[11px] font-mono uppercase tracking-wider sm:text-center ${
                      done ? "text-white/85" : "text-white/35"
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* 4. Status card */}
        <div className="mt-6 rounded-lg border border-white/10 bg-black/30 px-4 py-3.5">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">{current.label}</div>
          <p className="text-sm text-white/80 mt-1.5">{current.message}</p>
          {order.status === "shipped" && (order.courier || order.tracking_number) && (
            <p className="text-xs text-white/50 mt-2">
              {order.courier ? `${order.courier} · ` : ""}
              {order.tracking_url ? (
                <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
                  {order.tracking_number ?? "Track shipment"}
                </a>
              ) : (
                order.tracking_number
              )}
            </p>
          )}
        </div>
      </section>

      {/* 3. Order details */}
      <section className="border border-white/10 bg-white/[0.02] rounded-xl p-5 md:p-6">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Order details</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Field label="Service" value={data.details?.service} />
          <Field label="Material" value={data.details?.material} />
          <Field label="Color" value={data.details?.color} />
          <Field label="Quantity" value={data.details?.quantity} />
          <Field label="Finish" value={data.details?.finish} />
          <Field label="Dimensions" value={data.details?.dimensions} />
          {data.details?.layer_height && <Field label="Layer height" value={data.details.layer_height} />}
          {data.details?.infill && <Field label="Infill" value={data.details.infill} />}
          {data.details?.tolerance && <Field label="Tolerance" value={data.details.tolerance} />}
          {data.details?.lead_time && <Field label="Lead time" value={data.details.lead_time} />}
        </div>
      </section>

      {/* 5. Documents */}
      <section className="border border-white/10 bg-white/[0.02] rounded-xl p-5 md:p-6">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Documents</div>
        {data.documents?.length ? (
          <ul className="divide-y divide-white/5">
            {data.documents.map((d: any, i: number) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm truncate">{d.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/35 mt-0.5">{d.label}</div>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-semibold border border-white/15 hover:border-white/40 rounded-md px-3 py-1.5"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/45">No documents are available for this order yet.</p>
        )}
      </section>

      {/* Timeline */}
      {data.events?.length > 0 && (
        <section className="border border-white/10 bg-white/[0.02] rounded-xl p-5 md:p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4">Order history</div>
          <ol className="space-y-3 relative pl-5 border-l border-white/10">
            {data.events.map((ev: any, i: number) => (
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
      )}

      <p className="text-xs text-white/35">
        Questions about this order? Email{" "}
        <a href="mailto:info@toreo.gr" className="text-sky-300 hover:underline">
          info@toreo.gr
        </a>{" "}
        with your order number.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-white/35">{label}</div>
      <div className="text-white/85 mt-1 break-words">{value && String(value).trim() !== "" ? value : "—"}</div>
    </div>
  );
}
