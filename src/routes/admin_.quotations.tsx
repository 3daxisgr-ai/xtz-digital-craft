import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { quoteDocAll, quoteDocStatsFn, quoteDocConvert } from "@/lib/api/quote-doc.functions";

export const Route = createFileRoute("/admin_/quotations")({
  ssr: false,
  head: () => ({
    meta: [{ title: "TOREO — Quotations" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: QuotationsDashboard,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted" },
];

const money = (n: number) => `${(Number(n) || 0).toFixed(2)} €`;

const STATUS_COLOR: Record<string, string> = {
  draft: "text-white/60 border-white/15",
  generated: "text-sky-200 border-sky-400/30",
  sent: "text-sky-300 border-sky-400/40",
  viewed: "text-indigo-200 border-indigo-400/40",
  accepted: "text-emerald-300 border-emerald-400/40",
  accepted_by_customer: "text-emerald-300 border-emerald-400/40",
  rejected: "text-rose-300 border-rose-400/40",
  rejected_by_customer: "text-rose-300 border-rose-400/40",
  expired: "text-amber-200 border-amber-400/40",
  converted: "text-emerald-200 border-emerald-300/50",
  cancelled: "text-white/40 border-white/10",
  replaced: "text-white/40 border-white/10",
};

function QuotationsDashboard() {
  const list = useServerFn(quoteDocAll);
  const stats = useServerFn(quoteDocStatsFn);
  const convert = useServerFn(quoteDocConvert);

  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s]: any = await Promise.all([
        list({ data: { status, search: search || null, from: from || null, to: to ? `${to}T23:59:59Z` : null } }),
        stats(),
      ]);
      setRows(r ?? []);
      setCounts(s);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [list, stats, status, search, from, to]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function doConvert(number: string) {
    if (!confirm(`Convert ${number} into a production order?`)) return;
    try {
      await convert({ data: { number } });
      setMsg(`${number} converted ✓`);
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Conversion failed");
    }
  }

  const stat = (label: string, value: string | number) => (
    <div key={label} className="border border-white/10 rounded-sm px-3 py-2 bg-white/[0.02]">
      <div className="text-[9px] font-mono uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-lg font-mono mt-1">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0d12]/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Link to="/admin" className="text-[10px] font-mono tracking-widest text-white/60 hover:text-white">
          ← ADMIN
        </Link>
        <h1 className="text-sm font-mono tracking-widest uppercase">Quotations</h1>
        {msg && <span className="ml-auto text-[10px] font-mono text-emerald-300">{msg}</span>}
      </div>

      <div className="p-4 space-y-4">
        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {stat("Total", counts.total)}
            {stat("Draft", counts.draft)}
            {stat("Sent", counts.sent)}
            {stat("Accepted", counts.accepted)}
            {stat("Rejected", counts.rejected)}
            {stat("Expired", counts.expired)}
            {stat("Converted", counts.converted)}
            {stat("Open value", money(counts.value_open))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest rounded-sm border ${
                status === f.key ? "border-sky-400 text-sky-200" : "border-white/15 text-white/50 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, customer, email, order…"
            className="ml-auto bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm text-xs min-w-[220px]"
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-black/40 border border-white/10 px-2 py-1.5 rounded-sm text-xs" />
        </div>

        <div className="border border-white/10 rounded-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] font-mono uppercase tracking-widest text-white/40 border-b border-white/10">
                <th className="text-left px-3 py-2">Number</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-white/40">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-white/40">
                    No quotations match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2 font-mono">
                    <a className="hover:underline" href={`/admin/quote/${encodeURIComponent(r.number)}`}>
                      {r.number}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div>{r.customer || "—"}</div>
                    <div className="text-white/40 text-[10px]">{r.email}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-white/60">{r.order_code || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(r.total)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm ${
                        STATUS_COLOR[r.status] ?? "text-white/60 border-white/15"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/50">{new Date(r.created_at).toLocaleDateString("el-GR")}</td>
                  <td className="px-3 py-2 text-right">
                    {["accepted", "accepted_by_customer"].includes(r.status) && (
                      <button
                        onClick={() => doConvert(r.number)}
                        className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-emerald-400/40 text-emerald-200 rounded-sm"
                      >
                        Convert to order
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
