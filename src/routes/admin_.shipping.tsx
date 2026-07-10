import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminShippingList } from "@/lib/api/features.functions";
import { panelUpdateOrder } from "@/lib/api/panel.functions";

export const Route = createFileRoute("/admin_/shipping")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Shipping Dashboard" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ShippingPage,
});

const COURIERS = ["ACS", "ELTA Courier", "Geniki Taxydromiki", "Speedex", "DHL", "UPS", "FedEx", "TNT"];

function ShippingPage() {
  const list = useServerFn(adminShippingList);
  const update = useServerFn(panelUpdateOrder);
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<"ready" | "waiting" | "shipped" | "delayed">("ready");
  const [edit, setEdit] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    try { setRows(await list()); } catch (e) { console.error(e); }
  }
  useEffect(() => { reload(); }, []); // eslint-disable-line

  const filtered = rows.filter((r) => {
    if (tab === "ready") return r.status === "ready_for_shipping" && !r.tracking_number;
    if (tab === "waiting") return r.status === "ready_for_shipping" && r.tracking_number;
    if (tab === "shipped") return r.status === "shipped";
    if (tab === "delayed") return r.delayed;
    return true;
  });

  async function save(code: string, patch: any, alsoMark?: "shipped") {
    setBusy(code);
    try {
      const p: any = { ...patch };
      if (alsoMark === "shipped") p.status = "shipped";
      await update({ data: { order_code: code, patch: p } });
      setEdit((e) => ({ ...e, [code]: {} }));
      await reload();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.4em] text-amber-300/80">SHIPPING</div>
          <h1 className="text-2xl font-semibold">Shipping Dashboard</h1>
        </div>
        <Link to="/admin" className="text-xs font-mono tracking-widest text-white/60 hover:text-white">← ADMIN</Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["ready", "waiting", "shipped", "delayed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-mono tracking-widest uppercase border rounded-sm ${tab === t ? "border-amber-300 text-amber-300 bg-amber-300/10" : "border-white/10 text-white/50"}`}>
            {t === "ready" && "Ready to Ship"}
            {t === "waiting" && "Waiting for Courier"}
            {t === "shipped" && "Shipped"}
            {t === "delayed" && "Delayed"}
          </button>
        ))}
      </div>

      <div className="border border-white/10 rounded-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.03] border-b border-white/10">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:font-mono [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-widest [&>th]:text-white/50">
              <th>Order</th><th>Customer</th><th>Courier</th><th>Tracking</th><th>ETA</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-white/40">No orders in this view.</td></tr>
            )}
            {filtered.map((r) => {
              const e = edit[r.order_code] ?? {};
              return (
                <tr key={r.order_code} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono">{r.order_code}{r.delayed && <span className="ml-2 text-red-400">⚠</span>}</td>
                  <td className="px-3 py-2">
                    <div>{r.customer_name}</div>
                    <div className="text-white/40">{r.customer_email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select value={e.courier ?? r.courier ?? ""} onChange={(ev) => setEdit((x) => ({ ...x, [r.order_code]: { ...e, courier: ev.target.value } }))}
                      className="bg-black/40 border border-white/10 px-2 py-1 rounded-sm text-xs w-32">
                      <option value="">—</option>
                      {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={e.tracking_number ?? r.tracking_number ?? ""} onChange={(ev) => setEdit((x) => ({ ...x, [r.order_code]: { ...e, tracking_number: ev.target.value } }))}
                      placeholder="Tracking #" className="bg-black/40 border border-white/10 px-2 py-1 rounded-sm text-xs w-32" />
                    <input value={e.tracking_url ?? r.tracking_url ?? ""} onChange={(ev) => setEdit((x) => ({ ...x, [r.order_code]: { ...e, tracking_url: ev.target.value } }))}
                      placeholder="URL" className="bg-black/40 border border-white/10 px-2 py-1 rounded-sm text-xs w-40 mt-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={e.estimated_delivery ?? r.estimated_delivery ?? ""} onChange={(ev) => setEdit((x) => ({ ...x, [r.order_code]: { ...e, estimated_delivery: ev.target.value } }))}
                      className="bg-black/40 border border-white/10 px-2 py-1 rounded-sm text-xs" />
                  </td>
                  <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                    <button disabled={busy === r.order_code} onClick={() => save(r.order_code, e)}
                      className="px-2 py-1 border border-white/20 hover:border-white/40 rounded-sm text-[10px] font-mono uppercase">Save</button>
                    {r.status === "ready_for_shipping" && (
                      <button disabled={busy === r.order_code} onClick={() => save(r.order_code, e, "shipped")}
                        className="px-2 py-1 bg-emerald-500 text-black rounded-sm text-[10px] font-mono uppercase">Mark Shipped</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
