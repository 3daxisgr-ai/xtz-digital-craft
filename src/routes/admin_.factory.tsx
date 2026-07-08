import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import {
  panelListMachines, panelUpsertMachine, panelDeleteMachine,
  panelListMaterials, panelUpsertMaterial, panelSetMaterialStatus,
  panelAnalyzeFile, panelListAnalyses, panelDeleteAnalysis,
  panelGetSettings, panelUpdateSettings, panelReadinessCheck, panelApplyOverride,
  panelRecalculatePrice,
} from "@/lib/api/factory.functions";
import { panelMachineHealth, panelLogMachineService, panelUpdateMachineService } from "@/lib/api/scheduler.functions";


import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/factory")({
  component: FactoryPage,
  head: () => ({ meta: [{ title: "AI Factory OS · TOREO Admin" }] }),
});

function FactoryPage() {
  const check = useServerFn(adminCheck);
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { check().then((r) => setAuthed(r.authed)); }, [check]);

  if (authed === null) return <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">Loading…</div>;
  if (!authed) return (
    <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">
      <div>Not authenticated. <Link to="/admin" className="underline">Sign in</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">TOREO AI Factory OS</div>
          <h1 className="text-xl font-semibold">Factory Control</h1>
        </div>
        <Link to="/admin" className="text-sm text-white/70 hover:text-white">← Back to Admin</Link>
      </header>
      <main className="p-6 grid gap-8 max-w-7xl mx-auto">
        <div className="flex gap-4 text-sm flex-wrap">
          <Link to="/admin/live" className="text-emerald-300 hover:text-emerald-200">● Live Dashboard</Link>
          <Link to="/admin/scheduler" className="text-sky-300 hover:text-sky-200">→ Smart Scheduler</Link>
          <Link to="/admin/config" className="text-amber-300 hover:text-amber-200">→ Config & Optimizers</Link>
        </div>
        <SettingsPanel />
        <MachinesPanel />
        <MaterialsPanel />
        <AnalysisPanel />
        <ReadinessPanel />
      </main>
    </div>
  );
}

function SettingsPanel() {
  const load = useServerFn(panelGetSettings);
  const save = useServerFn(panelUpdateSettings);
  const [s, setS] = useState<any>(null);
  useEffect(() => { load().then(setS).catch(() => {}); }, []);
  if (!s) return null;
  const num = (k: string, label: string, suffix = "") => (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex items-center gap-1 mt-1">
        <Input type="number" step="0.01" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value === "" ? null : Number(e.target.value) })} className="bg-black/40 border-white/10 text-white" />
        {suffix && <span className="text-xs text-white/40">{suffix}</span>}
      </div>
    </label>
  );
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Business Settings — Profit Protection</h2>
          <p className="text-sm text-white/50">Floors enforced on every AI quotation. Below these, the quote is bumped up automatically.</p>
        </div>
        <Button onClick={async () => { try { await save({ data: { min_margin_pct: Number(s.min_margin_pct), min_hourly_rate_eur: Number(s.min_hourly_rate_eur), min_production_charge_eur: Number(s.min_production_charge_eur), min_order_value_eur: Number(s.min_order_value_eur), allow_overnight_default: !!s.allow_overnight_default, work_start_hour: Number(s.work_start_hour), work_end_hour: Number(s.work_end_hour), currency: s.currency ?? "EUR" } }); toast.success("Saved"); } catch (e: any) { toast.error(e.message ?? String(e)); } }}>Save</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {num("min_margin_pct", "Min margin", "%")}
        {num("min_hourly_rate_eur", "Min hourly rate", "€/h")}
        {num("min_production_charge_eur", "Min production charge", "€")}
        {num("min_order_value_eur", "Min order value", "€")}
        {num("work_start_hour", "Work start", "h")}
        {num("work_end_hour", "Work end", "h")}
        <label className="flex items-center gap-2 pt-6">
          <input type="checkbox" checked={!!s.allow_overnight_default} onChange={(e) => setS({ ...s, allow_overnight_default: e.target.checked })} />
          <span className="text-sm">Autonomous overnight OK by default</span>
        </label>
      </div>
    </Card>
  );
}

function ReadinessPanel() {
  const check = useServerFn(panelReadinessCheck);
  const override = useServerFn(panelApplyOverride);
  const listA = useServerFn(panelListAnalyses);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({ quote_price_eur: "", note: "" });

  async function run() {
    if (!code.trim()) return;
    try {
      const r = await check({ data: { order_code: code.trim() } });
      setResult(r);
      const list: any = await listA({ data: { order_code: code.trim() } });
      setAnalysis(Array.isArray(list) ? list[0] : null);
    } catch (e: any) { toast.error(e.message ?? String(e)); }
  }

  async function submitOverride() {
    if (!analysis) return;
    const patch: any = { note: overrideForm.note || undefined };
    if (overrideForm.quote_price_eur) patch.quote_price_eur = Number(overrideForm.quote_price_eur);
    try { await override({ data: { id: analysis.id, patch } }); toast.success("Override logged"); setOverrideForm({ quote_price_eur: "", note: "" }); run(); }
    catch (e: any) { toast.error(e.message ?? String(e)); }
  }

  const levelColor = result?.level === "production_ready" ? "text-emerald-300" : result?.level === "nearly_ready" ? "text-amber-300" : "text-red-300";
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Manufacturing Readiness</h2>
          <p className="text-sm text-white/50">Pre-production checklist. Run before scheduling any job.</p>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40">Order code</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TR-2026-0001" className="bg-black/40 border-white/10 text-white w-40" />
        </div>
        <Button onClick={run}>Check</Button>
      </div>

      {result && (
        <>
          <div className={`text-sm font-mono uppercase tracking-widest ${levelColor}`}>Status · {result.level.replace(/_/g, " ")}</div>
          <ul className="mt-3 divide-y divide-white/5">
            {result.checks.map((c: any) => (
              <li key={c.key} className="py-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={c.ok ? "text-emerald-400" : "text-red-400"}>{c.ok ? "✓" : "✗"}</span>
                  <span className="text-sm">{c.label}</span>
                </div>
                {c.note && <span className="text-xs text-white/50 max-w-xs text-right">{c.note}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {analysis && (
        <div className="mt-6">
          <AIAnalysisCard a={analysis} adminView />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Input placeholder="Override quote €" value={overrideForm.quote_price_eur} onChange={(e) => setOverrideForm({ ...overrideForm, quote_price_eur: e.target.value })} className="bg-black/40 border-white/10 text-white" />
            <Input placeholder="Reason (logged)" value={overrideForm.note} onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })} className="bg-black/40 border-white/10 text-white col-span-1" />
            <Button onClick={submitOverride} variant="secondary">Apply override</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function MachinesPanel() {
  const list = useServerFn(panelListMachines);
  const upsert = useServerFn(panelUpsertMachine);
  const del = useServerFn(panelDeleteMachine);
  const health = useServerFn(panelMachineHealth);
  const logService = useServerFn(panelLogMachineService);
  const updService = useServerFn(panelUpdateMachineService);
  const [rows, setRows] = useState<any[]>([]);
  const [hmap, setHmap] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ name: "", kind: "printer", vendor: "", model: "", hourly_cost: 0 });
  const refresh = () => {
    list().then(setRows).catch((e) => toast.error(String(e)));
    health().then((hs: any[]) => setHmap(Object.fromEntries(hs.map((h) => [h.id, h])))).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-1">Machines</h2>
      <p className="text-xs text-white/50 mb-4">Scheduler automatically skips a factory-wide maintenance window every day at <b>12:00 → 12:05</b>. Each machine tracks its run hours and warns before the next service.</p>
      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Kind (printer/cnc/laser)" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
        <Input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <div className="flex gap-2">
          <Input type="number" placeholder="€/h" value={form.hourly_cost} onChange={(e) => setForm({ ...form, hourly_cost: Number(e.target.value) })} />
          <Button onClick={async () => { if (!form.name) return; await upsert({ data: { patch: form as any } }); setForm({ name: "", kind: "printer", vendor: "", model: "", hourly_cost: 0 }); refresh(); }}>Add</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => {
          const h = hmap[r.id] ?? {};
          const pct = h.service_progress_pct ?? 0;
          const barColor = h.due_for_service ? "bg-red-400" : h.warning ? "bg-amber-400" : "bg-emerald-400";
          const chip = h.due_for_service
            ? <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded text-red-300 border-red-400/40">Service due</span>
            : h.warning
              ? <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded text-amber-300 border-amber-400/40">Service soon</span>
              : <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded text-emerald-300 border-emerald-400/40">Healthy</span>;
          return (
            <div key={r.id} className="border border-white/10 rounded px-3 py-2 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm flex items-center gap-2 min-w-0">
                  {chip}
                  <b>{r.name}</b> · {r.kind} · {r.vendor} {r.model} · €{r.hourly_cost}/h · <span className="text-white/60">{r.status}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={async () => { try { await logService({ data: { machine_id: r.id } }); toast.success("Service logged"); refresh(); } catch (e: any) { toast.error(e.message ?? String(e)); } }}>Log service</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Delete machine?")) return; await del({ data: { id: r.id } }); refresh(); }}>Delete</Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Service cycle: {Number(r.hours_since_service ?? 0).toFixed(1)}h / {Number(r.service_interval_hours ?? 200).toFixed(0)}h</span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-white/50 whitespace-nowrap">
                  Total {Number(r.total_hours ?? 0).toFixed(1)}h · Last {r.last_service_at ? new Date(r.last_service_at).toLocaleDateString() : "—"}
                </div>
                <label className="flex items-center gap-1">
                  <span>Interval</span>
                  <Input type="number" defaultValue={r.service_interval_hours ?? 200} className="bg-black/40 border-white/10 text-white h-7 w-20 text-xs"
                    onBlur={async (e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      if (v > 0 && v !== Number(r.service_interval_hours)) {
                        try { await updService({ data: { machine_id: r.id, service_interval_hours: v } }); refresh(); } catch (err: any) { toast.error(err.message ?? String(err)); }
                      }
                    }} />
                  <span>h</span>
                </label>
              </div>
            </div>
          );
        })}
        {!rows.length && <div className="text-sm text-white/50">No machines yet.</div>}
      </div>
    </Card>
  );
}


const MAT_STATUSES = ["in_stock","low_stock","out_of_stock","disabled"] as const;
type MatStatus = typeof MAT_STATUSES[number];
const MAT_STATUS_LABEL: Record<MatStatus, string> = {
  in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock", disabled: "Disabled",
};
const MAT_STATUS_COLOR: Record<MatStatus, string> = {
  in_stock: "text-emerald-300 border-emerald-400/40",
  low_stock: "text-amber-300 border-amber-400/40",
  out_of_stock: "text-red-300 border-red-400/40",
  disabled: "text-zinc-400 border-zinc-500/40",
};

function MaterialsPanel() {
  const list = useServerFn(panelListMaterials);
  const upsert = useServerFn(panelUpsertMaterial);
  const setStatus = useServerFn(panelSetMaterialStatus);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", name: "", family: "PLA", process: "3d_printing", price_per_kg: 25, density_g_cm3: 1.24 });
  const refresh = () => list().then(setRows).catch((e) => toast.error(String(e)));
  useEffect(() => { refresh(); }, []);
  async function quick(id: string, status: MatStatus) {
    try { await setStatus({ data: { id, status } }); toast.success(MAT_STATUS_LABEL[status]); refresh(); }
    catch (e: any) { toast.error(e.message ?? String(e)); }
  }
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-1">Materials Inventory</h2>
      <p className="text-xs text-white/50 mb-4">Materials are never deleted. Toggle status to control customer availability. Existing orders keep their original material.</p>
      <div className="grid md:grid-cols-6 gap-2 mb-4">
        <Input placeholder="Code (e.g. PLA-BLK)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Family" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} />
        <Input placeholder="Process" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} />
        <Input type="number" placeholder="€/kg" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: Number(e.target.value) })} />
        <div className="flex gap-2">
          <Input type="number" step="0.01" placeholder="g/cm³" value={form.density_g_cm3} onChange={(e) => setForm({ ...form, density_g_cm3: Number(e.target.value) })} />
          <Button onClick={async () => { if (!form.code || !form.name) return; await upsert({ data: { patch: { ...form, status: "in_stock" } as any } }); setForm({ code: "", name: "", family: "PLA", process: "3d_printing", price_per_kg: 25, density_g_cm3: 1.24 }); refresh(); }}>Add</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => {
          const st = (r.status ?? "in_stock") as MatStatus;
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 rounded px-3 py-2">
              <div className="text-sm flex items-center gap-2 min-w-0">
                <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded ${MAT_STATUS_COLOR[st]}`}>{MAT_STATUS_LABEL[st]}</span>
                <b>{r.code}</b> · {r.name} · {r.family}/{r.process} · €{r.price_per_kg}/kg · {r.stock_kg ?? 0}kg
              </div>
              <div className="flex gap-1">
                {MAT_STATUSES.map((s2) => (
                  <button
                    key={s2}
                    onClick={() => quick(r.id, s2)}
                    className={`px-2 py-1 text-[10px] font-mono uppercase rounded border ${st === s2 ? MAT_STATUS_COLOR[s2] : "border-white/10 text-white/40 hover:text-white"}`}
                  >
                    {s2 === "in_stock" ? "In" : s2 === "low_stock" ? "Low" : s2 === "out_of_stock" ? "OOS" : "Off"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!rows.length && <div className="text-sm text-white/50">No materials yet.</div>}
      </div>
    </Card>
  );
}


function AnalysisPanel() {
  const analyze = useServerFn(panelAnalyzeFile);
  const list = useServerFn(panelListAnalyses);
  const del = useServerFn(panelDeleteAnalysis);
  const recalc = useServerFn(panelRecalculatePrice);
  const [orderCode, setOrderCode] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"prototype"|"durable"|"decorative">("prototype");
  const [service, setService] = useState<"3d_printing"|"cnc"|"laser"|"welding"|"other">("3d_printing");
  const load = async () => { if (!orderCode) return; try { setRows(await list({ data: { order_code: orderCode } })); } catch (e) { toast.error(String(e)); } };

  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-1">AI Analysis</h2>
      <p className="text-sm text-white/60 mb-4">Enter an order code (e.g. TR-2026-0001), pick service + production mode, then run analysis. Results are saved to the project.</p>
      <div className="grid md:grid-cols-5 gap-2 mb-3">
        <Input placeholder="TR-2026-0001" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} onBlur={load} />
        <select className="bg-neutral-800 border border-white/10 rounded px-2 text-sm" value={service} onChange={(e) => setService(e.target.value as any)}>
          <option value="3d_printing">3D printing</option><option value="cnc">CNC</option><option value="laser">Laser</option><option value="welding">Welding</option><option value="other">Other</option>
        </select>
        <select className="bg-neutral-800 border border-white/10 rounded px-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="prototype">Prototype</option><option value="durable">Durable</option><option value="decorative">Decorative</option>
        </select>
        <Button disabled={!orderCode || busy} onClick={async () => {
          setBusy(true);
          try { await analyze({ data: { order_code: orderCode, service, production_mode: mode } }); toast.success("Analysis complete"); await load(); }
          catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
          finally { setBusy(false); }
        }}>{busy ? "Analysing…" : "Run AI Analysis"}</Button>
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-white/10 rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.file_name ?? "—"} · {r.service} · {r.production_mode}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={async () => { try { await recalc({ data: { id: r.id } }); toast.success("Price recalculated"); load(); } catch (e: any) { toast.error(e.message ?? String(e)); } }}>Recalculate Price</Button>
                <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: r.id } }); load(); }}>Delete</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <Stat label="DFM" value={`${r.dfm_score}/100`} />
              <Stat label="Complexity" value={`${r.complexity_score}/100`} />
              <Stat label="Printability" value={`${r.printability_score}/100`} />
              <Stat label="Confidence" value={`${r.confidence}%`} />
              <Stat label="Material" value={r.recommended_material} />
              <Stat label="Nozzle" value={r.recommended_nozzle ?? "—"} />
              <Stat label="Layer" value={r.recommended_layer_height_mm ? `${r.recommended_layer_height_mm} mm` : "—"} />
              <Stat label="Infill" value={r.recommended_infill_pct != null ? `${r.recommended_infill_pct}%` : "—"} />
              <Stat label="Print time" value={`${r.estimated_print_hours} h`} />
              <Stat label="Material use" value={`${r.estimated_material_g} g`} />
              <Stat label="Cost" value={`€${r.estimated_cost_eur}`} />
              <Stat label="Quote" value={`€${r.quote_price_eur}`} />
            </div>
            {r.ai_summary && <p className="mt-3 text-white/80">{r.ai_summary}</p>}
            {Array.isArray(r.ai_warnings) && r.ai_warnings.length > 0 && (
              <div className="mt-2"><b className="text-amber-400">Warnings:</b><ul className="list-disc pl-5">{r.ai_warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
            )}
            {Array.isArray(r.ai_recommendations) && r.ai_recommendations.length > 0 && (
              <div className="mt-2"><b className="text-emerald-400">Recommendations:</b><ul className="list-disc pl-5">{r.ai_recommendations.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
            )}
          </div>
        ))}
        {!rows.length && orderCode && <div className="text-sm text-white/50">No analyses for this order yet.</div>}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border border-white/10 rounded px-2 py-1"><div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div><div>{value}</div></div>;
}
