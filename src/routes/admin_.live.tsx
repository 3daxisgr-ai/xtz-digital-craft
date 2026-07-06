// TOREO AI Factory OS — Part 4.2B: live factory dashboard + analytics.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import { panelLiveAnalytics } from "@/lib/api/insights.functions";
import { STATUS_LABEL } from "@/lib/api/orders.functions";

export const Route = createFileRoute("/admin_/live")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live Factory · TOREO Admin" }, { name: "robots", content: "noindex" }] }),
  component: LivePage,
});

function LivePage() {
  const check = useServerFn(adminCheck);
  const load = useServerFn(panelLiveAnalytics);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { check().then((r) => setAuthed(r.authed)).catch(() => setAuthed(false)); }, [check]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    async function tick() {
      try {
        const d = await load();
        if (!cancelled) setData(d);
      } catch (e: any) {
        if (!cancelled) setErr(e.message);
      }
    }
    tick();
    const t = setInterval(tick, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [authed, load]);

  if (authed === null) return <Wrap><div className="text-white/40 text-xs font-mono">VERIFYING…</div></Wrap>;
  if (!authed) return <Wrap><div>Not authenticated. <Link to="/admin" className="underline text-amber-300">Sign in</Link></div></Wrap>;
  if (err) return <Wrap><div className="text-red-400 text-sm">{err}</div></Wrap>;
  if (!data) return <Wrap><div className="text-white/40 text-xs font-mono">LOADING FACTORY TELEMETRY…</div></Wrap>;

  return (
    <Wrap>
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300/70 font-mono">● LIVE</div>
          <h1 className="text-2xl font-semibold mt-1">Factory Dashboard</h1>
          <div className="text-xs text-white/40 mt-0.5">Refreshes every 15s · Updated {new Date(data.updated_at).toLocaleTimeString()}</div>
        </div>
        <div className="flex gap-3 text-xs">
          <Link to="/admin_/scheduler" className="text-sky-300 hover:text-sky-200">Scheduler →</Link>
          <Link to="/admin_/factory" className="text-sky-300 hover:text-sky-200">Factory →</Link>
          <Link to="/admin_/config" className="text-sky-300 hover:text-sky-200">Config →</Link>
          <Link to="/admin" className="text-white/60 hover:text-white">Admin ←</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Revenue 7d" value={`€${data.revenue.last_7d.toFixed(0)}`} sub={`${data.revenue.orders_7d} orders`} />
        <Kpi label="Revenue 30d" value={`€${data.revenue.last_30d.toFixed(0)}`} sub={`${data.revenue.orders_30d} orders`} />
        <Kpi label="Open orders" value={data.orders.open} sub={`${data.production.open_hours}h backlog`} />
        <Kpi label="Utilization" value={`${data.production.utilization_pct}%`} sub={`${data.production.running} running`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Panel title="Machine Load">
          <div className="space-y-2">
            {data.production.machines.length === 0 && <div className="text-xs text-white/40">No machines.</div>}
            {data.production.machines.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 text-xs">
                <span className={`w-2 h-2 rounded-full ${m.active && m.status !== "offline" ? "bg-emerald-400" : "bg-white/20"}`} />
                <span className="w-40 truncate">{m.name}</span>
                <span className="text-white/40 uppercase font-mono text-[10px]">{m.kind}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden">
                  <div className="h-full bg-sky-400/60" style={{ width: `${Math.min(100, (m.load_hours / 60) * 100)}%` }} />
                </div>
                <span className="w-14 text-right tabular-nums text-white/70">{m.load_hours}h</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Status Breakdown (30d)">
          <div className="space-y-1.5">
            {Object.entries(data.orders.status_breakdown).map(([k, v]: any) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-48 truncate text-white/80">{STATUS_LABEL[k] ?? k}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden">
                  <div className="h-full bg-amber-300/60" style={{ width: `${Math.min(100, v * 8)}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-white/70">{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Panel title="Quality">
          <div className="text-3xl font-semibold">{data.quality.avg_printability.toFixed(1)}<span className="text-lg text-white/40">/100</span></div>
          <div className="text-xs text-white/50 mt-1">Avg printability · {data.quality.analyses_30d} analyses</div>
          <div className="mt-4 text-xs">Avg margin <span className="text-emerald-300">{data.quality.avg_margin_pct}%</span></div>
        </Panel>
        <Panel title="Production Queue">
          <div className="space-y-1 text-xs">
            {Object.entries(data.production.jobs_by_state).map(([k, v]: any) => (
              <div key={k} className="flex justify-between"><span className="text-white/60 uppercase font-mono text-[10px]">{k}</span><span className="tabular-nums">{v}</span></div>
            ))}
            {Object.keys(data.production.jobs_by_state).length === 0 && <div className="text-white/40">No jobs.</div>}
          </div>
        </Panel>
        <Panel title="Low Stock">
          <div className="space-y-1 text-xs">
            {data.stock.low.length === 0 && <div className="text-emerald-300/70">All materials stocked ✓</div>}
            {data.stock.low.map((m: any) => (
              <div key={m.code} className="flex justify-between">
                <span className="truncate text-white/80">{m.name}</span>
                <span className="tabular-nums text-red-300">{m.stock_kg}kg</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Open Orders">
        <div className="divide-y divide-white/5">
          {data.orders.recent_open.slice(0, 10).map((o: any) => (
            <Link key={o.id} to="/admin" className="flex items-center gap-3 py-2 text-xs hover:bg-white/5 px-2 -mx-2 rounded">
              <span className="font-mono text-amber-300/80 w-32">{o.order_code}</span>
              <span className="flex-1 truncate">{o.customer_name}</span>
              <span className="text-white/50">{STATUS_LABEL[o.status] ?? o.status}</span>
              <span className="w-20 text-right tabular-nums text-white/70">{o.quote_price ? `€${Number(o.quote_price).toFixed(0)}` : "—"}</span>
            </Link>
          ))}
          {data.orders.recent_open.length === 0 && <div className="text-white/40 text-xs py-4">No open orders.</div>}
        </div>
      </Panel>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0a0d12] text-white px-6 py-8 max-w-7xl mx-auto">{children}</div>;
}
function Kpi({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] rounded p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-white/50 mt-0.5">{sub}</div>}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] rounded p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-3">{title}</div>
      {children}
    </div>
  );
}
